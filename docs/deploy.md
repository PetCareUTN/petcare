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
2. Crear dos **environments**: `staging` y `production`.
3. En cada uno, agregar dos servicios:
   - **PostgreSQL**, desde el catálogo de Railway.
   - **Backend**, desde el repo, con estos ajustes:
     - Root Directory: `backend`
     - Build Command: `npm ci && npm run build`
     - Pre-deploy Command: `npm run migration:run:prod`
     - Start Command: `npm run start:prod`
     - Branch: `develop` en staging, `main` en producción.
4. Agregar un **volumen** al servicio de backend, montado en `/app/uploads`.
   Sin esto, las fotos de mascotas y los archivos clínicos se borran en cada
   deploy, porque se guardan en el disco del contenedor (`process.cwd()/uploads`).
5. Cargar las variables de entorno (sección 3).
6. Sembrar los roles **una vez por base nueva**, porque el sistema no arranca
   sin ellos. Desde la máquina de uno, con la URL pública de la base:

   ```bash
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/seeders/01-roles.sql
   ```

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
| `DATABASE_URL` | la que expone el Postgres de Railway | reemplaza a las cinco `DATABASE_*` |
| `DATABASE_SSL` | `true` | sin esto la conexión falla por el certificado |
| `TZ` | `America/Argentina/Cordoba` | si no, el recordatorio de vacunas sale a las 5 AM |
| `JWT_SECRET` | uno largo y aleatorio, distinto por ambiente | |
| `JWT_EXPIRES_IN` | `1d` | |
| `CORS_ORIGIN` | dominio del frontend, sin barra final | acepta varios separados por coma |
| `BREVO_API_KEY` | la del panel de Brevo | |
| `MAIL_FROM` | remitente verificado en Brevo | si no, los mails caen en spam |
| `GOOGLE_CLIENT_ID` | el client "Web application" | no es secreto |
| `GOOGLE_GEOCODING_API_KEY` | la de Google Cloud | conviene ponerle límite de cuota |

`PORT` lo inyecta Railway solo: no hay que definirlo.

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
