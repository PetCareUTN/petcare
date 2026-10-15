# PetCare Android

Aplicación móvil Android de PetCare desarrollada con Kotlin, Jetpack Compose y Material 3.

## Requisitos

- Android Studio compatible con Android Gradle Plugin 9.2.1.
- JDK 17.
- Android SDK 36 instalado.
- Emulador o dispositivo Android con API 24 o superior.

## Abrir el proyecto

1. Abrir Android Studio.
2. Seleccionar **Open**.
3. Elegir la carpeta `mobile-android/`.
4. Esperar a que finalice la sincronización de Gradle.

La carpeta que debe abrirse como proyecto Android es `mobile-android`, no la raíz completa del repositorio.

## Compilar y probar

En Windows:

```powershell
cd mobile-android
.\gradlew.bat testDebugUnitTest assembleDebug
```

En Linux o macOS:

```bash
cd mobile-android
./gradlew testDebugUnitTest assembleDebug
```

El APK de desarrollo se genera en:

```text
app/build/outputs/apk/debug/app-debug.apk
```

## Ejecutar

1. Crear o seleccionar un emulador con API 24 o superior, o conectar un dispositivo físico con depuración USB habilitada.
2. Seleccionar la configuración `app`.
3. Presionar **Run**.
4. Verificar que se abra la pantalla inicial de PetCare.

Para las futuras pruebas de Bluetooth Low Energy se deberá utilizar un dispositivo Android físico compatible.

## Estructura inicial

```text
mobile-android/
├── app/
│   └── src/
│       ├── main/
│       ├── test/
│       └── androidTest/
├── gradle/
├── build.gradle.kts
├── settings.gradle.kts
├── gradlew
└── gradlew.bat
```

## Configuración actual

- Package/application ID: `com.petcare.app`.
- Minimum SDK: 24.
- Target SDK: 36.
- UI: Jetpack Compose con Material 3.
- Pruebas unitarias: JUnit.
- Pruebas instrumentadas: AndroidX Test y Espresso.

## Seguridad y archivos locales

- No versionar claves, tokens, credenciales ni URLs con secretos.
- No registrar tokens o contraseñas en logs.
- No versionar `local.properties`, `.idea/`, archivos de firma ni directorios `build/`.
- Las URLs y configuraciones por ambiente deberán mantenerse fuera del código fuente cuando se incorpore la conexión con el backend.

## Estado

La estructura base está creada. Antes de cerrar P1-81 se debe conservar evidencia de:

- Sincronización exitosa de Gradle.
- Ejecución de `testDebugUnitTest`.
- Generación de `app-debug.apk`.
- Aplicación ejecutándose en un emulador o dispositivo.
