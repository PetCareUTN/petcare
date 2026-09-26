# Probar la suscripción de Mercado Pago localmente (con túnel)

Guía para dejar andando el cobro de la suscripción del veterinario en tu
máquina, sin desplegar PetCare. Es **solo para desarrollo**: en producción van
URLs públicas reales del dominio.

## Cómo funciona

1. El veterinario entra a **"Mi suscripción"** y toca "Suscribirme / Pagar".
2. El backend crea un *preapproval* en Mercado Pago (entorno TEST) con dos
   URLs, **ambas sobre el túnel del backend** (un solo túnel):
   - `back_url`: `${API_PUBLIC_URL || API_URL || http://localhost:3000}/suscripciones/retorno`
     → el endpoint público de retorno, que hace un **302** al navegador hacia
     `${FRONTEND_PUBLIC_URL || primer origen de CORS_ORIGIN || http://localhost:4200}/suscripciones`
   - `notification_url`: `${API_PUBLIC_URL || API_URL || http://localhost:3000}/suscripciones/webhook`
3. MP notifica al webhook (`POST /suscripciones/webhook`) y la suscripción pasa
   a `ACTIVA`. Si el webhook no llega, `GET /suscripciones/mia` verifica el
   estado real contra MP (pull-verification) la próxima vez que el veterinario
   abre la pantalla: la suscripción se activa igual.

**Por qué un solo túnel (el del backend)**: MP exige que `back_url` y
`notification_url` sean URLs **públicas**; con `localhost` responde 400 al
crear el preapproval: `Invalid value for back_url, must be a valid URL`. Como
las dos URLs apuntan al backend, alcanza con exponer solo él
(`ngrok http 3000`). El redirect final a `localhost:4200` lo sigue el
**navegador del veterinario**, en la misma máquina que corre el frontend: ahí
`localhost` sí existe, por eso no hace falta un segundo túnel.

## Qué necesitás

### 1. Abrir UN túnel para el backend

Con [ngrok](https://ngrok.com):

```
ngrok http 3000     # backend → https://abc123.ngrok-free.dev
```

Anotá la URL pública. El frontend sigue corriendo en
`http://localhost:4200` (lo alcanza el navegador al terminar el checkout).

### 2. Setear la URL en tu `.env`

En `backend/.env` (que no se versiona): `API_PUBLIC_URL` es **necesaria** para
probar el checkout real. La otra variable es opcional.

```
API_PUBLIC_URL=https://abc123.ngrok-free.dev   # back_url y webhook (backend)

# Opcional: destino del redirect después del checkout. Si no está, se usa el
# primer origen de CORS_ORIGIN (http://localhost:4200).
# FRONTEND_PUBLIC_URL=http://localhost:4200
```

Si no seteás `API_PUBLIC_URL`, el `back_url` y el webhook quedan en
`localhost:3000` y el checkout falla con el 400 de arriba: los defaults
sirven solo para desarrollo sin MP.

Si un valor no es una URL `http(s)` válida (p. ej. sin `http://`), el backend
lo descarta con un `warn` en consola y usa la siguiente candidata.

### 3. Reiniciar el backend

`dotenv` carga el `.env` una sola vez al arrancar: sin reinicio, las variables
nuevas no existen.

### 4. Verificar que se usen las URLs correctas

Al tocar "Suscribirme / Pagar", el backend imprime en consola:

```
BACK_URL: https://abc123.ngrok-free.dev/suscripciones/retorno
WEBHOOK_URL: https://abc123.ngrok-free.dev/suscripciones/webhook
```

Son solo URLs (no hay credenciales en esos logs).

## Probar el flujo

1. Login con un veterinario aprobado → "Mi suscripción" → "Suscribirme / Pagar".
2. En el checkout de MP (entorno TEST) usá una tarjeta de prueba:
   - Aprobada: `4509 9535 6623 3704`
   - Rechazada: `5031 4332 1540 6351`
3. Aprobado → volvés a `/suscripciones` y la pantalla confirma el pago
   (hace polling contra el backend, que a su vez consulta a MP).
4. Rechazado → la suscripción queda `PENDIENTE_PAGO`, **sin gracia** y sin
   acceso: es el comportamiento esperado del primer pago.

## Caveats

- **Error `MPBadRequestError: Invalid value for back_url, must be a valid
  URL`** → `API_PUBLIC_URL` no está seteada y el `back_url` que mandó el
  backend es `http://localhost:3000/suscripciones/retorno` (mirá el log
  `BACK_URL:`). Seteala con la URL del túnel y reiniciá el backend.
- **Después del checkout no llego a `localhost:4200/suscripciones`** → revisá
  que el `GET /suscripciones/retorno` responda 302 con `Location:
  http://localhost:4200/suscripciones` (log/pestana Network) y que
  `FRONTEND_PUBLIC_URL` o el primer origen de `CORS_ORIGIN` sean el frontend
  correcto.
- **La URL del túnel cambia cada vez que reiniciás ngrok.** Los *preapprovals*
  creados con la URL anterior quedan apuntando al túnel viejo. No hace falta
  nada raro: la pull-verification de `GET /suscripciones/mia` sana el estado
  cuando el veterinario vuelve a abrir la pantalla de pago. Si querés notificar
  con la URL nueva, creá el pago de nuevo.
- **ngrok (plan free) muestra una página de aviso** antes de dejar pasar
  ciertas requests. Si el webhook llega como HTML en vez de JSON, es ese
  interstitial: se saltea con el header `ngrok-skip-browser-warning` (ver la
  doc de ngrok) o dejando correr la pull-verification de arriba.
- **`MP_WEBHOOK_SECRET` es opcional en local.** Vacío, el webhook se procesa
  igual, solo que sin validar la firma `x-signature`. Si lo dejás seteado
  (p. ej. `change_me`), tenés que configurar la misma *Secret Signature* en el
  panel de MP, sino la firma no cierra y MP recibe un 401 en cada notificación.
- Cada desarrollador usa **su propio túnel y sus propias credenciales TEST**:
  no hay nada que compartir salvo, si hace falta, un Access Token de entorno
  TEST (no tiene valor real).

## Seguridad

- El `.env` está en `.gitignore` (raíz y `backend/`): tus URLs de túnel y tus
  credenciales nunca se commitean. Lo único versionado es `.env.example`, con
  placeholders.
- Nunca subas a Git un Access Token de producción (`APP_USR-...`): solo se usa
  el de TEST, que no mueve dinero real, y vive únicamente en tu `.env`.
- Los únicos logs del flujo son `BACK_URL` y `WEBHOOK_URL`: imprimen URLs
  públicas, jamás el Access Token ni el Secret.
