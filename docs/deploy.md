# Deploy a staging y producción

Guía para publicar PetCare fuera de la máquina de cada uno. Sigue la decisión
tomada en el **ADR-007 (Despliegue cloud centralizado)** del documento de
Instancia 2: **Railway** para el backend y PostgreSQL, **Vercel** para el
frontend web, y la app Android distribuida como APK firmado.

Ambientes, según el Working Agreement:

| Ambiente | Rama | Backend + base | Frontend |
| --- | --- | --- | --- |
| desarrollo | ramas `feature/*`, `fix/*` | local (`docker compose up -d`) | `npm start` |
| staging | `develop` | Railway, environment `staging` | Vercel (preview) |
| producción | `main` | Railway, environment `production` | Vercel (production) |

---

## 1. Railway: backend y base de datos

Una sola persona del equipo crea el proyecto y después invita al resto, porque
Railway cobra por asiento. Ver los costos estimados en Instancia 1, sección
"Costo operativo mensual futuro en producción".

1. Crear un proyecto nuevo conectado al repo `PetCareUTN/petcare`.

   Si el repo no aparece en la lista, es porque la GitHub App de Railway se
   instala por cuenta y `petcare` es de la organizacion, no de la cuenta
   personal. Se arregla instalandola en la organizacion desde
   <https://github.com/apps/railway-app/installations/new> (ojo: el slug es
   `railway-app`, no `railway`), eligiendo PetCareUTN y solo el repo `petcare`.

   Conviene crear el proyecto en el workspace personal: un workspace de
   organizacion cobra asiento a cada miembro.
2. Crear dos **environments**: `staging` y `production`.
3. En cada uno, agregar dos servicios:
   - **PostgreSQL**, desde el catálogo de Railway.
   - **PostgreSQL**: dejarle el nombre `Postgres`, porque las variables del
     backend lo referencian por ese nombre.
   - **Backend**, desde el repo, con estos ajustes:
     - Root Directory: `backend`
     - Build Command: `npm ci && npm run build`
     - Pre-deploy Command: `npm run migration:run:prod`
     - Start Command: `npm run start:prod`. Hay que ponerlo a mano: el
       `npm start` que detecta Railway levanta el modo desarrollo, que necesita
       el CLI de Nest y no está en produccion.
     - Watch Paths: `/backend/**`, para que un cambio en la app Android o en el
       frontend no redespliegue la API.
     - Branch: `develop` en staging, `main` en producción.

       Atención: hoy `main` está muy atrás de `develop` y su carpeta `backend/`
       tiene solo el `.gitkeep` del scaffold inicial, así que un deploy desde
       `main` falla con "Railpack failed to prepare the build". Hasta que se
       haga el merge de release, producción también apunta a `develop`.
4. Agregar un **volumen** al servicio de backend, montado en `/app/uploads`.
   Sin esto, las fotos de mascotas y los archivos clínicos se borran en cada
   deploy, porque se guardan en el disco del contenedor (`process.cwd()/uploads`).

   El volumen **no se monta durante el pre-deploy**, solo cuando arranca el
   servicio. No nos afecta porque las migraciones no tocan archivos, pero hay
   que tenerlo en cuenta si alguna vez se agrega un script que sí lo haga.
5. Cargar las variables de entorno (sección 3).
6. Sembrar los roles **una vez por base nueva**, porque sin ellos no se puede
   registrar ni un usuario. La via mas simple es pegar el contenido de
   `database/seeders/01-roles.sql` en el editor de consultas del servicio
   Postgres, en la pestaña **Data**. Desde la maquina de uno, con la URL
   publica de la base, es equivalente:

   ```bash
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/seeders/01-roles.sql
   ```

7. Crear el **primer administrador**, que tampoco viene sembrado. Sin el no hay
   forma de aprobar veterinarios ni prestadores, y esas cuentas no pueden
   siquiera iniciar sesion hasta que alguien las valide.

   Registrar un usuario comun (desde la web, la app o `POST /auth/register`) y
   despues promoverlo, una sola vez, en el editor de consultas:

   ```sql
   UPDATE usuarios
   SET id_rol = (SELECT id_rol FROM roles WHERE nombre = 'administrador')
   WHERE email = 'el-mail-del-admin@ejemplo.com';
   ```

   El cambio de rol recien se refleja cuando esa persona vuelve a iniciar
   sesion, porque el rol viaja dentro del JWT.

A partir de ahí, cada merge a `develop` despliega staging y cada merge a `main`
despliega producción, que es exactamente el flujo del Working Agreement.

## 2. Vercel: frontend web

1. Importar el repo y poner **Root Directory** en `frontend-web`.
2. No hace falta configurar nada más: `frontend-web/vercel.json` ya define el
   comando de build, la carpeta de salida y el rewrite de rutas que necesita
   Angular para que al recargar una URL interna no dé 404.
3. En Settings → Git, dejar `main` como Production Branch.

El script `scripts/build-vercel.mjs` elige la configuración de Angular según
`VERCEL_ENV`: los deploys de `main` compilan con `production` (pegan al backend
de producción) y los de `develop` y los Pull Requests compilan con `staging`.

Las URLs del backend viven en `src/environments/environment.prod.ts` y
`environment.staging.ts`. **Hay que reemplazarlas por los dominios reales de
Railway apenas existan.**

## 3. Variables de entorno del backend

Se cargan en Railway, por environment. El archivo `backend/.env.example` tiene
la lista completa con sus explicaciones.

| Variable | Producción | Notas |
| --- | --- | --- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | variable de referencia al otro servicio; reemplaza a las cinco `DATABASE_*` |
| `DATABASE_SSL` | `true` | si el deploy falla con "the server does not support SSL connections", poner `false`: la conexión entre servicios ya va por la red privada |
| `TZ` | `America/Argentina/Cordoba` | si no, el recordatorio de vacunas sale a las 5 AM |
| `JWT_SECRET` | uno largo y aleatorio, distinto por ambiente | |
| `JWT_EXPIRES_IN` | `1d` | |
| `CORS_ORIGIN` | dominio del frontend, sin barra final | acepta varios separados por coma |
| `API_URL` | el dominio del backend en Railway | con esto se arman los links de matrículas y habilitaciones; si falta, apuntan a `localhost:3000` y no abren |
| `MP_ACCESS_TOKEN` | el del **Seller Test User** de Mercado Pago | ver la advertencia de abajo |
| `MP_PUBLIC_KEY` | la de pruebas | no es secreta |
| `MP_WEBHOOK_SECRET` | el de "Tus integraciones" → Webhooks | sin esto el webhook se procesa sin validar firma |
| `MP_PAYER_EMAIL` | el del **Buyer Test User** | mientras se use el entorno de prueba, sí va: ver abajo |
| `FRONTEND_PUBLIC_URL` | el dominio de Vercel | a dónde vuelve el navegador después del checkout |
| `BREVO_API_KEY` | la del panel de Brevo | |
| `MAIL_FROM` | remitente verificado en Brevo | si no, los mails caen en spam |
| `GOOGLE_CLIENT_ID` | el client "Web application" | no es secreto |
| `GOOGLE_GEOCODING_API_KEY` | la de Google Cloud | conviene ponerle límite de cuota |

`PORT` lo inyecta Railway solo: no hay que definirlo.

**Mercado Pago: usar siempre las credenciales de prueba.** El backend en
Railway tiene una URL pública real, así que con un access token productivo los
cobros de la suscripción de veterinarios serían cobros de verdad, con plata de
verdad. Para la tesis y para el piloto van las de test.

`API_PUBLIC_URL` no hace falta en Railway: existe para exponer el backend local
mediante un túnel durante el desarrollo (ver `docs/suscripciones-mp-local.md`).
En producción el backend ya es público y alcanza con `API_URL`. Dicho de otra
forma: **en el ambiente desplegado no hace falta ngrok**, que es la única razón
por la que esa guía existe.

`MP_PAYER_EMAIL` pisa el mail del pagador en todas las suscripciones. En el
entorno de prueba de Mercado Pago hay que configurarla con el Buyer Test User,
porque MP no acepta como pagador el mail real de un veterinario. La consecuencia
es que todos los veterinarios que se suscriban desde el ambiente desplegado
pagan como ese mismo usuario de prueba: alcanza para la demo, pero hay que
saberlo. El dia que exista una operacion real con credenciales productivas, esta
variable se saca.

Como el ambiente desplegado tiene un solo juego de credenciales, el Buyer Test
User que se use para pagar tiene que ser el que corresponde al Seller Test User
cargado en `MP_ACCESS_TOKEN`. Quien haga la demo necesita tambien la contraseña
de ese usuario comprador para completar el checkout.

Dos advertencias al cargarlas:

- Si Railway ofrece **importar las variables sugeridas del `.env.example`**, no
  aceptar: carga los `change_me` como si fueran valores reales.
- Cada cambio queda **staged**. Hay que apretar **Deploy** para que se aplique.

## 4. App Android

La URL del backend ya no está fija en el código: sale de `BuildConfig.API_BASE_URL`,
que se define por variante en `app/build.gradle.kts`.

- **debug**: `http://10.0.2.2:3000/`, o sea el backend local desde el emulador.
- **release**: la constante `API_URL_PRODUCCION` de `build.gradle.kts`.

Para compilar contra otro backend sin tocar el repo, por ejemplo para probar
staging:

```bash
./gradlew assembleRelease -PPETCARE_API_URL=https://petcare-backend-staging.up.railway.app/
```

La URL tiene que terminar en barra, porque lo exige Retrofit.

`usesCleartextTraffic` quedó en `true` solo para debug. La variante de release
no permite HTTP plano, así que el backend tiene que estar sí o sí en HTTPS
(Railway ya lo da).

### Firmar el APK

Para la entrega alcanza con distribuirlo por Drive; no hace falta Play Store.

1. Generar una keystore y **guardarla fuera del repo**. Si se pierde, no se
   puede volver a firmar la misma app.
2. Registrar el SHA-1 de esa keystore en el client de Android del proyecto de
   Google Cloud. Sin este paso **el ingreso con Google falla solo en release**,
   mientras que en debug sigue andando. Ver `docs/ingreso-con-google.md`.

## 5. Checklist de la primera vez

- [ ] Proyecto de Railway creado, con environments `staging` y `production`
- [ ] Volumen montado en `/app/uploads` en los dos environments
- [ ] Variables de entorno cargadas en los dos environments
- [ ] Migraciones aplicadas y seeder de roles corrido en cada base
- [ ] Proyecto de Vercel importado con Root Directory `frontend-web`
- [ ] URLs reales puestas en `environment.prod.ts` y `environment.staging.ts`
- [ ] `CORS_ORIGIN` apuntando al dominio de Vercel de cada ambiente
- [ ] `API_URL_PRODUCCION` real en `app/build.gradle.kts`
- [ ] SHA-1 de la keystore de release registrado en Google Cloud
- [ ] Ingreso con Google probado en el APK de release
- [ ] Subida de una foto de mascota probada **después** de un redeploy, para
      confirmar que el volumen persiste
- [ ] ADR-007 pasado de "Propuesto" a "Aceptado" en el documento de Instancia 2

## 6. Backups

Railway hace backups automáticos según el plan, pero conviene tener uno propio
antes de la demo:

```bash
pg_dump "$DATABASE_URL" -Fc -f petcare-$(date +%F).dump
```
