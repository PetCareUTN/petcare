# Integración continua

El repositorio valida automáticamente cada Pull Request hacia `develop` y `main`
mediante GitHub Actions. El objetivo es que las verificaciones que hoy figuran
como checklist manual en el Pull Request (que el código compila y que las pruebas
existentes siguen funcionando) dejen de depender de que alguien se acuerde de
hacerlas.

---

## Workflows

| Archivo | Qué hace | ¿Bloquea el merge? |
| --- | --- | --- |
| `.github/workflows/ci.yml` | Compila y prueba los tres componentes | Sí |
| `.github/workflows/calidad.yml` | ESLint del backend y Prettier del frontend | No, todavía |

Ambos se disparan en `pull_request` y `push` hacia `develop` y `main`, y pueden
lanzarse a mano desde la pestaña *Actions* (`workflow_dispatch`).

Si se pushean dos commits seguidos a la misma rama, la corrida anterior se
cancela para no consumir minutos al pedo.

---

## Jobs de `ci.yml`

### `backend` — build y pruebas unitarias

Node 22, `npm ci`, `npm run build` y `npm run test:cov`. Son 262 pruebas
unitarias sobre 20 suites. El reporte de cobertura queda publicado como artifact
descargable (`cobertura-backend`, 14 días de retención), lo que sirve como
evidencia para la documentación de la tesis.

### `backend-e2e` — pruebas e2e

Es el job más delicado, porque las pruebas e2e levantan el `AppModule` completo
contra una base PostgreSQL real. La secuencia es:

1. Se levanta un **service container** `postgres:16`, con las mismas credenciales
   que usa `docker-compose.yml` en desarrollo.
2. Se aplican todas las migraciones de TypeORM (`npm run migration:run`). Esto
   importa porque el `AppModule` usa `synchronize: false`: sin migraciones no hay
   tablas.
3. Se ejecuta el seeder `database/seeders/01-roles.sql`. Ninguna migración
   inserta los roles, y varias pruebas los buscan con `findOneOrFail`, así que
   sin este paso la suite falla entera.
4. Se corren las pruebas con `--runInBand`.

> **`--runInBand` no es opcional.** Las suites e2e comparten una única base y
> borran filas entre pruebas (`DELETE FROM "usuarios"` y demás). Si Jest las
> corre en paralelo, se pisan entre sí y los resultados son intermitentes.

Las variables de entorno se definen en el propio workflow. `BREVO_API_KEY`,
`MAIL_FROM`, `GOOGLE_CLIENT_ID` y `GOOGLE_GEOCODING_API_KEY` llevan valores
ficticios: ninguna prueba e2e manda un mail ni llama a Google, pero las
dependencias se instancian al construir el módulo. **No hace falta cargar ningún
secret en GitHub** para que el CI funcione.

### `frontend` — build y pruebas

Node 22, `npm ci`, `npm run build` (build de producción, que es donde aparecen
los errores de compilación de templates) y `npm test -- --watch=false`, que corre
Vitest sobre jsdom.

### `android` — build y pruebas unitarias

JDK 21 de Temurin, que es el mismo que trae el JBR de Android Studio con el que
compila el equipo. Corre `testDebugUnitTest` (71 pruebas) y después
`assembleDebug`. El APK se publica como artifact `petcare-debug-apk`, así que
cualquiera puede bajar e instalar la app de un PR sin compilar nada.

`local.properties` está gitignoreado porque contiene la `MAPS_API_KEY`. No hace
falta recrearlo en CI: `app/build.gradle.kts` cae a un placeholder si el archivo
no existe, y el SDK se toma de `ANDROID_HOME`. Como consecuencia, **el mapa no
carga tiles en el APK que genera el CI**; para probar geolocalización hay que
compilar en local.

---

## Reproducir el CI en local

```bash
# backend - unitarias
cd backend && npm ci && npm run build && npm run test:cov

# backend - e2e (desde la raiz del repo)
docker compose up -d postgres
(cd backend && npm run migration:run)
docker exec -i petcare-postgres psql -U petcare_user -d petcare -v ON_ERROR_STOP=1 < database/seeders/01-roles.sql
(cd backend && npm run test:e2e -- --runInBand)

# frontend
cd frontend-web && npm ci && npm run build && npm test -- --watch=false

# android
cd mobile-android && ./gradlew testDebugUnitTest assembleDebug
```

---

## Deuda técnica conocida

Lo que el pipeline dejó a la vista apenas se puso en marcha.

### Pruebas que quedaron viejas (resueltas)

Al incorporar el pipeline aparecieron tres pruebas que venían fallando sin que
nadie se enterara, justamente porque nunca había nada que las corriera de forma
automática. Las tres fallaban porque el comportamiento de la aplicación cambió a
propósito y la prueba quedó vieja, no porque hubiera un bug:

| Prueba | Qué esperaba | Cómo quedó |
| --- | --- | --- |
| `clinical-events.e2e-spec.ts` › CLIN-05 | 403 al crear un evento clínico con un veterinario pendiente | El bloqueo pasó a `/auth/login`, que le niega el token mientras un administrador no valide la cuenta. La prueba verifica el 403 ahí |
| `users-profile.e2e-spec.ts` › PROF-05 | 409 al mandar un email ya usado en `PATCH /users/me` | Ese endpoint ahora rechaza con 400 cualquier cambio de email. La regla del email duplicado se movió a `POST /users/me/cambiar-email`, cubierta por la nueva PROF-10 |
| `ProfileValidatorTest` › teléfono opcional | Que el teléfono fuera opcional | El teléfono es obligatorio; la prueba ahora verifica que se rechace vacío |

Con eso, las 51 pruebas e2e del backend y las 71 unitarias de Android pasan en verde.

### Lint y formato

`calidad.yml` es informativo por ahora: el backend arrastra unos 140 hallazgos de
ESLint y el frontend unos 120 archivos sin formatear con Prettier.

La causa de fondo es que el script `lint` del backend lleva `--fix`, así que
reescribe los archivos en vez de reportar. Por eso se agregó `lint:ci`, que corre
ESLint sin `--fix` y sirve como verificación real.

Cuando la deuda llegue a cero, alcanza con sacar los `continue-on-error: true` de
`calidad.yml` para que pase a ser un gate.

---

## Configuración pendiente en GitHub

El pipeline funciona apenas se mergea, pero para que **impida** mergear en rojo
hay que configurarlo en la interfaz de GitHub (no se puede hacer desde el repo):

*Settings → Branches → Add branch ruleset*, sobre `develop` y `main`:

- Require a pull request before merging (con 1 aprobación, que ya es la regla del equipo).
- Require status checks to pass, seleccionando:
  - `Backend - build y pruebas unitarias`
  - `Backend - pruebas e2e`
  - `Frontend web - build y pruebas`
  - `Android - build y pruebas unitarias`
- Require branches to be up to date before merging.

Se puede aplicar apenas se mergee este pipeline: las pruebas que estaban en rojo
ya quedaron corregidas.
