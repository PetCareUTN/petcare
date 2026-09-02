# Ingreso con Google (app Android)

Guía para dejar andando el ingreso con Google en tu máquina. Es **solo para la
app mobile**: la web sigue funcionando con email y contraseña.

## Cómo funciona

1. La persona toca "Continuar con Google" y elige su cuenta.
2. La app recibe de Google un **ID token** firmado.
3. Ese token se manda al backend (`POST /auth/google`), que lo valida contra
   Google (firma, vencimiento y que sea para nuestro client id).
4. Si la cuenta ya existe, el backend devuelve la sesión y se entra derecho.
   Si es alguien nuevo, aparece la pantalla **"Completá tu registro"** pidiendo
   el DNI (Google no lo entrega y el registro de PetCare lo necesita), y recién
   ahí se crea la cuenta con `POST /auth/google/registro`.

Si el email de la cuenta de Google ya existía como usuario con contraseña, se le
vincula el id de Google en vez de crear un duplicado.

## Qué necesitás para probarlo

Con bajar los cambios **no alcanza**. Hacen falta estos cuatro pasos.

### 1. Correr la migración

```
cd backend
npm run migration:run
```

Agrega `google_id` a `usuarios` y permite que `password` sea nulo (las cuentas
de Google no tienen contraseña propia).

### 2. Poner GOOGLE_CLIENT_ID en tu .env

El `.env` no se versiona, así que hay que agregarlo a mano. El valor está en
`backend/.env.example`. Es el Client ID de tipo **Web**, el mismo que ya viene
en `mobile-android/app/src/main/res/values/google.xml`.

### 3. Registrar el SHA-1 de tu keystore (el paso que más se olvida)

Google valida que el APK esté firmado con una huella conocida, y **cada uno
tiene su propia `debug.keystore`**. Si no registrás la tuya, el ingreso te va a
rebotar aunque todo lo demás esté bien.

Sacá tu huella:

```
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

En Windows, si `keytool` no está en el PATH, está dentro del JDK que usa Gradle
(por ejemplo `C:\Users\<usuario>\.gradle\jdks\<jdk>\bin\keytool.exe`).

Copiá la línea que dice `SHA1:` y pasásela a Franca, que tiene acceso al
proyecto de Google Cloud (`petcare-507323`). Ahí se crea un cliente OAuth de
tipo **Android** con:

- Package: `com.petcare.app`
- Huella SHA-1: la tuya

Ojo: cada cliente Android admite **una sola** huella, así que va uno por
persona. Todos conviven en el mismo proyecto y no hay que tocar nada en el
código: la app sigue usando el Client ID **Web**.

### 4. Estar en la lista de usuarios de prueba

La app está en modo "Prueba" en Google Cloud, así que solo pueden entrar las
cuentas cargadas como usuarios de prueba. Si tu mail de Google no está en la
lista, pedile a Franca que te agregue.

### Nota sobre el primer build

Esta rama suma tres dependencias nuevas (Credential Manager y googleid), así que
la primera compilación tiene que ser **sin** `--offline`:

```
./gradlew assembleDebug
```

Después ya podés volver a compilar offline.

## Cómo probarlo

1. Levantá Postgres, el backend y, si usás un celular por USB, el túnel:
   `adb reverse tcp:3000 tcp:3000`.
2. Instalá el APK y abrí la app.
3. Tocá "Continuar con Google" (está tanto en el login como en el registro).
4. La primera vez te va a pedir el DNI. Al confirmarlo entrás con la sesión ya
   iniciada.

## Si algo falla

El mensaje que muestra la app dice bastante:

| Mensaje | Qué mirar |
| --- | --- |
| "No se pudo conectar con el servidor" | El backend no está levantado, o se cayó el túnel `adb reverse` (se corta al desenchufar el cable o al reiniciar adb). |
| "Google rechazo el ingreso" / token inválido | Falta tu SHA-1 en Google Cloud, o `GOOGLE_CLIENT_ID` no coincide con el de `google.xml`. Un cliente OAuth recién creado puede tardar entre 5 minutos y unas horas en propagarse. |
| "No hay ninguna cuenta de Google configurada en el telefono" | Agregá una cuenta de Google en Ajustes de Android. |
| "Falta configurar el Client ID de Google en google.xml" | El `google.xml` quedó con el placeholder. |
| "Ese DNI ya está registrado" | El documento ya pertenece a otra cuenta. |

Del lado del backend, si `GOOGLE_CLIENT_ID` no está en el `.env`, `/auth/google`
responde 500 y en el log aparece "Falta GOOGLE_CLIENT_ID en el .env".
