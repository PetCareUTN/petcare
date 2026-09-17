# Spike US-30: escaneo BLE en segundo plano (Android)

Historia: [P1-169](https://sofimunoz01.atlassian.net/browse/P1-169) · Épico: Localización BLE (P1-166)

Este documento cierra el análisis previo que pedían las notas de la historia. Todo lo
que sigue está evaluado contra la configuración real del módulo: `minSdk 24`,
`targetSdk 36`, `compileSdk 36` (`mobile-android/app/build.gradle.kts`).

El rango minSdk 24 → targetSdk 36 es amplio y obliga a sostener **dos caminos de
permisos** en paralelo, que es de donde sale buena parte de la complejidad.

## 1. Estrategia de escaneo: foreground service, no WorkManager

**Decisión: foreground service con `foregroundServiceType="location"`, arrancado por
el usuario desde el toggle de configuración.**

Las alternativas se descartan por límites de plataforma, no por preferencia:

- **Escaneo desde un background service común**: desde Android 8 (API 26) el sistema
  filtra los resultados de `startScan()` cuando la app no está en primer plano. El
  `ScanCallback` deja de recibir entregas. No cumple el criterio de aceptación.
- **`WorkManager` periódico**: el intervalo mínimo es de 15 minutos y no garantiza una
  ventana de escaneo lo bastante larga ni puntual. Para una mascota perdida en
  movimiento, 15 minutos de granularidad es demasiado grueso.
- **`PendingIntent` de `startScan()`**: sobrevive al proceso, pero sigue sujeto a las
  restricciones de ubicación en segundo plano y da mucho menos control sobre el duty
  cycle (y por lo tanto sobre la batería, que es un criterio de aceptación explícito).

El tipo de foreground service tiene que ser `location` y no `connectedDevice`: derivamos
la ubicación aproximada del detector, y es el tipo `location` el que habilita seguir
accediendo a ubicación con la app en segundo plano.

### Consecuencia a comunicar al equipo

En Android 15+ (API 35/36, que es nuestro target) **un foreground service de tipo
`location` no puede arrancarse desde `BOOT_COMPLETED`**. Es decir: después de que el
usuario reinicia el teléfono, la colaboración **no se reanuda sola** hasta que vuelva
a abrir la app.

Es una limitación de plataforma, no algo que podamos programar alrededor. Hay que
decidirlo como producto:

- **(a)** Aceptarlo y reanudar el escaneo al abrir la app (más simple; es lo que
  propongo para esta historia).
- **(b)** Usar un service de tipo `connectedDevice`, que sí puede arrancar en boot, a
  cambio de resignar la ubicación — lo que dejaría la detección sin coordenadas y
  rompería el criterio de aceptación de US-31.

Propongo (a), y dejarlo anotado como limitación conocida.

## 2. Matriz de permisos

Al manifest (`mobile-android/app/src/main/AndroidManifest.xml`, que hoy solo declara
`INTERNET`, `WRITE_EXTERNAL_STORAGE` y los dos de ubicación) hay que sumarle:

| Permiso | Rango | Runtime | Para qué |
|---|---|---|---|
| `BLUETOOTH` | `maxSdkVersion="30"` | no | Camino legacy (API 24–30) |
| `BLUETOOTH_ADMIN` | `maxSdkVersion="30"` | no | Camino legacy (API 24–30) |
| `BLUETOOTH_SCAN` | API 31+ | **sí** | Escaneo en Android 12+ |
| `ACCESS_FINE_LOCATION` | todas | **sí** | Ya declarado. Requerido para escanear en API ≤ 30 |
| `ACCESS_BACKGROUND_LOCATION` | API 29+ | **sí, aparte** | Escanear con la app cerrada |
| `POST_NOTIFICATIONS` | API 33+ | **sí** | Notificación del foreground service |
| `FOREGROUND_SERVICE` | API 28+ | no | Declarar el service |
| `FOREGROUND_SERVICE_LOCATION` | API 34+ | no | Obligatorio desde API 34: debe coincidir con `foregroundServiceType` |

> **No confundir el permiso con el atributo.** El *permiso*
> `FOREGROUND_SERVICE_LOCATION` es API 34+, pero el *atributo*
> `android:foregroundServiceType="location"` del manifest existe desde **API 29**
> (`ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION`, `since="29"` en
> `platforms/android-36.1/data/api-versions.xml` del SDK).
>
> O sea: un foreground service de tipo `location` **se puede declarar y correr desde
> Android 10**. Declarar además el permiso en un equipo API 30 es inofensivo, el
> sistema lo ignora. Esto importa para elegir el equipo de pruebas (ver la sección
> del final).

Dos trampas concretas:

- **`BLUETOOTH_SCAN` NO lleva `android:usesPermissionFlags="neverForLocation"`.** Ese
  flag es para apps que escanean sin derivar posición; nosotros justamente derivamos
  ubicación, así que declararlo sería incorrecto.
- **`ACCESS_BACKGROUND_LOCATION` no se puede pedir en el mismo diálogo** que el resto.
  Android obliga a un flujo escalonado: primero foreground location y, recién después,
  en una segunda instancia con justificación visible, el permiso de background (que en
  API 30+ ni siquiera aparece como diálogo: manda al usuario a Ajustes).

Esto significa que el "falla controlada, con mensaje al usuario" de la prueba de
aceptación no es un mensaje solo: es una pantalla de onboarding propia explicando por
qué se pide cada permiso. Conviene reflejarlo en la estimación.

El patrón de permisos runtime ya usado en el repo es `rememberMultiplePermissionsState`
de accompanist, en `features/mapa/ui/MapaPrestadoresScreen.kt`. Sirve de base, pero no
cubre el escalonamiento de background location.

## 3. El tag: Blue Charm BC021 MultiBeacon

Es el que compró el equipo ([ficha del fabricante](https://bluecharmbeacons.com/product/bluetooth-ble-ibeacon-bc021-multibeacon-with-button-trigger-and-motion-sensor/)).
Lo relevante para nosotros:

| | |
|---|---|
| Chip | nRF52810 |
| Formatos | iBeacon, Eddystone-UID, Eddystone-TLM, KSensor (acelerómetro) |
| Intervalo de advertising | 100 – 10.000 ms, configurable |
| Potencia TX | −40 a +4 dBm, seleccionable |
| Alcance | 0,2 – 90 m (declarado) |
| Batería | CR2032, ~16 meses @ 1 s / 0 dBm / unconnectable |
| Configuración | app gratuita del fabricante (iPhone/Android) |
| Tamaño | 36 × 36 × 5,75 mm |
| **IP** | **no es waterproof** |

### Decisión: configurarlo como Eddystone-UID, no como iBeacon

Esto **corrige** lo que había asumido antes sobre el `ScanFilter`, y el motivo es que
los dos formatos se anuncian en campos distintos del paquete BLE:

- **iBeacon viaja en el campo de *manufacturer specific data*** con el company ID de
  Apple (`0x004C`). No tiene service UUID, así que `ScanFilter.setServiceUuid()` **no
  lo matchea**. Habría que filtrar con `setManufacturerData(0x004C, data, mask)`, y ahí
  aparece el problema real: `0x004C` lo usan también todos los iPhone del entorno para
  Continuity/Handoff. Sin una máscara muy precisa sobre los bytes del proximity UUID,
  el filtro despierta el CPU con cada iPhone que pasa cerca — justo lo que queremos
  evitar en un escaneo que corre todo el día.
- **Eddystone-UID viaja como *service data* bajo el service UUID `0xFEAA`**, que sí
  se filtra directo con `ScanFilter.setServiceUuid(ParcelUuid("0000FEAA-…"))`, en el
  chip Bluetooth y sin despertar el CPU.

Además, el frame Eddystone-UID ya trae la identificación partida en dos justo como la
necesitamos: **10 bytes de namespace + 6 bytes de instance**.

- **Namespace** = constante para toda la flota PetCare. Va en la máscara del
  `ScanFilter`, así que el chip descarta cualquier Eddystone ajeno.
- **Instance** = identificador del tag concreto → es el **`tagId`** del contrato
  (punto 5), 12 caracteres hex.

> Aclaración por las dudas: Google dio de baja su *Proximity Beacon API*, pero
> Eddystone como formato de advertising son bytes en el aire y no dependen de ningún
> servicio de Google. Usarlo no nos ata a nada.

El BC021 puede emitir Eddystone-TLM además del UID, lo que nos da **nivel de batería
del tag gratis** — útil para avisarle al dueño que hay que cambiar la pila. No es
alcance de US-30, pero conviene no romperlo: vale la pena dejarlo anotado para el
backlog.

El botón y el acelerómetro no los necesita US-30, pero el acelerómetro sí puede
interesarle a **US-34** (detección de separación): coordinar con Simón antes de fijar
la configuración del tag, porque es una sola y la comparten las dos historias.

### Riesgo de producto a levantar en la daily

**El BC021 no es waterproof, y mide 36 × 36 mm.** Para el caso de uso de la tesis —un
tag en el collar de una mascota que se pierde *afuera*, potencialmente bajo lluvia— eso
es un problema real, y el tamaño es incómodo para un gato o un perro chico. Sirve
perfecto para desarrollar y demostrar las historias, pero conviene que quede registrado
como limitación del prototipo y no como decisión de producto final.

## 4. Batería

Ahora se puede cerrar el duty cycle con números concretos, porque hay dos baterías en
juego y tiran para lados opuestos:

- `ScanSettings.SCAN_MODE_LOW_POWER` como base (ciclo del orden de ~0,5 s de escaneo
  cada ~5 s, gestionado por el chip).
- **`ScanFilter` por service UUID `0xFEAA` + máscara del namespace PetCare**, para que
  el descarte lo haga el chip Bluetooth. Es la decisión que más impacta en el consumo
  del teléfono.
- **Duty cycling propio**: ventana corta de escaneo cada N minutos, con N configurable
  como pide el criterio de aceptación. La ventana tiene que ser **cómodamente mayor al
  intervalo de advertising del tag**; con el tag a 1 s, una ventana de ~5 s da varias
  chances de capturarlo.
- **Intervalo de advertising del tag: arrancar en 1 s.** Es el valor con el que el
  fabricante declara los 16 meses de CR2032. Subirlo ahorra pila del tag pero obliga a
  ventanas de escaneo más largas en todos los teléfonos colaboradores — es decir,
  cambia batería del tag por batería de los detectores. Para una mascota perdida en
  movimiento, 1 s es el lado correcto del trade-off.

El umbral concreto de batería del teléfono hay que medirlo en dispositivo físico
(ver punto 6); estos valores son el punto de partida, no el resultado.

### Límite duro: Android throttlea los reinicios de escaneo

Android bloquea a una app que llame `startScan()` **más de 5 veces en 30 segundos**, y
lo hace **en silencio**: no llega `onScanFailed`, simplemente dejan de entregarse
resultados. Nos mordió en el banco de pruebas, donde el switch del filtro reiniciaba el
escaneo automáticamente.

Impacta directo en el duty cycling del punto anterior, porque cada ventana de escaneo es
un `startScan()` nuevo: **el intervalo N no puede bajar de ~10 segundos**, y conviene
mantenerlo en minutos con margen de sobra. Es otro motivo para no intentar un duty cycle
agresivo.

Para el que depure esto a mano: apagar y prender el Bluetooth limpia el bloqueo.

## 5. Contrato de detección ⟵ *lo que consume US-31*

Este es el entregable que desbloquea a [P1-170](https://sofimunoz01.atlassian.net/browse/P1-170)
(ingesta backend) y que comparte motor con [P1-173](https://sofimunoz01.atlassian.net/browse/P1-173) (US-34).

```
POST /detecciones          ← sin Authorization, endpoint anónimo
```

```json
{
  "deteccionId": "9f1c0b6e-3a41-4a2e-8c77-1f2b5d9e0a33",
  "tagId": "4F2A91C0DE01",
  "rssi": -67,
  "detectadoEn": "2026-09-12T18:30:00.000Z",
  "latitud": -31.420,
  "longitud": -64.189,
  "precisionMetros": 25
}
```

Decisiones detrás del payload:

- **No viaja nada del detector**: ni userId, ni token, ni device id, ni installation id.
  El request **no debe pasar por `AuthTokenInterceptor`**
  (`features/auth/data/remote/RetrofitClient.kt`), así que necesita su propia instancia
  de Retrofit sin ese interceptor. Es un desvío deliberado del patrón del repo: hay que
  dejarlo comentado en el código para que nadie lo "corrija" después.
- **`deteccionId` es un UUID v4 generado en el cliente**, que se reusa si el envío se
  reintenta. Es lo que permite deduplicar sin identificar a nadie: el backend pone un
  índice único sobre esa columna y listo. Un índice sobre `(tagId, detectadoEn)` no
  alcanzaría, porque dos detectores distintos pueden ver el mismo tag en el mismo
  instante — y esas dos detecciones son justamente las que sirven para triangular.
- **Coordenadas redondeadas a 3 decimales** (~110 m). La historia pide "ubicación
  aproximada", y el redondeo evita que las detecciones terminen dibujando el domicilio
  del detector. El `rssi` ya aporta la noción de cercanía.
- **`detectadoEn` en UTC ISO-8601**, generado en el dispositivo. Las detecciones se
  encolan cuando no hay red, así que el timestamp del server no sirve.
- **`tagId` es el *instance ID* del frame Eddystone-UID**: 6 bytes → 12 caracteres hex
  en mayúscula, sin separadores. El *namespace* no viaja en el payload porque es
  constante para toda la flota; el cliente ya filtró por él. **Esto es un insumo para
  US-32** (asociar tag a mascota, de Sofi): el campo que el dueño carga o escanea al
  vincular el tag tiene que ser exactamente este mismo string, o las detecciones no
  van a matchear contra ninguna mascota.

## 6. Qué queda pendiente de dispositivo físico

El emulador no expone radio BLE real ni permite medir consumo, así que estos cuatro
puntos no se pueden cerrar sin hardware:

1. Detección efectiva de un tag conocido con la app en segundo plano y la pantalla
   apagada, sostenida durante al menos una hora.
2. Consumo real durante esa hora, para fijar el umbral del criterio de aceptación y
   calibrar el intervalo de duty cycling.
3. Comportamiento con las optimizaciones agresivas de batería de cada fabricante
   (Xiaomi, Samsung y Huawei matan foreground services que Android puro mantiene).
   Conviene probar en al menos dos marcas distintas.
4. Confirmación de que el service sobrevive a Doze con la pantalla apagada.
5. **Alcance real del BC021 a 0 dBm** en exteriores. Los 90 m del fabricante son en
   línea de vista; el número realista condiciona qué densidad de detectores hace falta
   para que la red colaborativa sirva de algo — dato interesante para la tesis, no solo
   para la historia.
6. Verificar con la app del fabricante que el BC021 efectivamente puede emitir
   **Eddystone-UID con namespace e instance a medida** (es lo que supone el punto 3).
   Si por algún motivo no dejara configurar el namespace, hay que replantear el filtro.

## 7. Banco de pruebas

Para poder contestar los puntos de arriba hay un scanner de laboratorio en el sourceSet
`app/src/debug/`, que **solo existe en las builds debug**: no toca `src/main` ni el
`MainActivity`, y se borra entero con `rm -rf app/src/debug` cuando el spike termine.

- `debug/AndroidManifest.xml` — los permisos BLE de la tabla del punto 2, más un icono
  de lanzador aparte ("PetCare BLE Debug") para entrar sin pasar por el login.
- `debug/…/ble/BeaconFrame.kt` — decodificadores puros de Eddystone-UID/TLM/URL e
  iBeacon. Sin dependencias de Android, así que se testean sin dispositivo. Es la única
  pieza que sobrevive tal cual al motor de escaneo definitivo.
- `debug/…/ble/BleScanDebugActivity.kt` — escaneo en primer plano, con un switch para
  comparar en vivo cuánto ruido saca el `ScanFilter` por `0xFEAA`.
- `app/src/test/…/ble/BeaconFrameTest.kt` — 9 tests sobre tramas sintéticas.

```bash
cd mobile-android && ./gradlew testDebugUnitTest installDebug
```

Los tests corren sin hardware, así que si en el campo el scanner no muestra nada y los
tests pasan, el problema está en el escaneo, los permisos o la configuración del tag —
no en la decodificación.

### Primera medición (12/09/2026)

El scanner detectó el tag sin problemas. Estado **de fábrica**:

| | |
|---|---|
| Nombre BLE | `BCPro_213364` (es el modelo **Pro**) |
| MAC | `DD:88:00:00:1E:B9` |
| RSSI a corta distancia | −54 dBm |
| Formato de fábrica | **iBeacon** → hay que reconfigurarlo |
| UUID de fábrica | `426C7565-4368-6172-6D42-6561636F6E73` |
| major / minor | 3838 / 4949 |

**Ese UUID de fábrica es ASCII**: `426C7565…` se lee `B l u e C h a r m B e a c o n s`.
Es decir, viene igual en todos los BC021 del mundo. Los defaults de Eddystone del
fabricante tienen el mismo problema: namespace `626C7565636861726D31` (= `bluecharm1`)
e instance `000000000001`.

Conclusión: **el namespace de la flota PetCare hay que fijarlo sí o sí**, en cualquiera
de los dos formatos. Dejarlo de fábrica haría que todos los tags fueran indistinguibles
salvo por major/minor.

De los 5 dispositivos que vio el scanner, **solo el tag decodificó un frame conocido**;
los otros cuatro son direcciones aleatorias de teléfonos y periféricos. Es justamente el
ruido que el `ScanFilter` va a descartar en el chip.

> Nota: no usar la MAC como identificador del tag. Muchos dispositivos BLE la rotan por
> privacidad, y además nos ataría a una capa que no controlamos. El `tagId` es el
> instance ID del frame Eddystone, como define el punto 5.

### Cómo reconfigurarlo

La app es **KBeaconPro** (Android y iPhone, gratis).

1. Abrir KBeaconPro y conectarse al tag. Si no aparece como conectable, **un click al
   botón** lo deja conectable por 30 segundos (o sacar y poner la pila).
2. Contraseña por defecto: `0000000000000000`. **No cambiarla**: el fabricante avisa
   que no hay forma de recuperarla si se pierde.
3. Ir al menú *Beacon / Adv Type* del slot 0 y elegir **UID**.
4. Fijar namespace (10 bytes) e instance (6 bytes). El namespace es el de la flota
   PetCare y va igual en todos los tags; el instance es el `tagId` de este tag.

   > ⚠️ **KBeaconPro exige el prefijo `0x`.** Sin él tira
   > *"eddystone uid namespace id format error, make sure it is 10 byte length"*,
   > que confunde bastante porque el valor sí mide 10 bytes. Va
   > `0x5045544341524555544E`, no `5045544341524555544E`.

5. **Tocar UPLOAD** en la pantalla de General Info. Sin eso no se guarda nada.

Dos cosas que ya vienen bien de fábrica y no hay que tocar:

- **Intervalo de advertising: 1022,5 ms**, que es prácticamente el 1 s que pedía el
  punto 4 — y es el valor con el que el fabricante declara los 16 meses de pila.
- **TX power: 0 dBm**, también el de la especificación de batería.

El modelo Pro tiene **5 slots de broadcast simultáneos**, así que se puede dejar el
slot 0 en Eddystone-UID y otro slot en Eddystone-TLM para tener el nivel de batería del
tag sin resignar nada. El decoder ya soporta los dos.

### Identificadores de la flota

| | |
|---|---|
| **Namespace PetCare** (10 bytes, igual en todos los tags) | `5045544341524555544E` |
| **Instance del tag de pruebas** (6 bytes = `tagId`) | `C3BBDE4B02A1` |

**Namespace legible, instance aleatorio.** No es una inconsistencia, son dos criterios
distintos:

- El **namespace** viaja en claro y cualquiera con un scanner lo lee, así que no hay
  nada que ganar haciéndolo opaco. `5045544341524555544E` es el ASCII de `PETCAREUTN`
  (10 caracteres justos), y hace que un tag de PetCare se reconozca de un vistazo en el
  scanner o en un log. Es el mismo criterio que usa el fabricante con sus defaults.
- El **instance** conviene que sea aleatorio y no correlativo, porque el endpoint de
  ingesta de US-31 es anónimo por diseño. Con instances secuenciales cualquiera podría
  enumerarlos y mandar detecciones falsas de mascotas que nunca vio, desviando a los
  dueños a ubicaciones inventadas. Con 6 bytes aleatorios son 2⁴⁸ combinaciones y
  enumerar deja de ser viable.

  No es seguridad fuerte —quien esté físicamente cerca de la mascota puede clonar lo que
  el tag emite, y evitarlo requeriría Eddystone-EID con criptografía, fuera de alcance—
  pero elimina el ataque remoto trivial. Vale anotarlo como decisión de diseño.

Cada tag nuevo que se sume a la flota lleva **el mismo namespace y un instance aleatorio
propio**, que es el dato que el dueño asocia a su mascota en US-32.

### Riesgo despejado ✅ — el enfoque está validado de punta a punta

**KBeaconPro sí deja editar namespace e instance**, y el tag reconfigurado se lee
correctamente desde el scanner:

```
1 dispositivos (filtrando por 0xFEAA)
BCPro_213364 · DD:88:00:00:1E:B9 · RSSI -45 dBm · 164 paquetes
  EDDYSTONE-UID
    namespace : 5045544341524555544E
    instance  : C3BBDE4B02A1
```

Tres cosas quedan confirmadas con esto:

1. **El `ScanFilter` por service UUID `0xFEAA` funciona**: la misma escena pasó de 8
   dispositivos a 1. Todo el ruido de teléfonos y periféricos lo descarta el chip
   Bluetooth sin despertar el CPU, que era la premisa de la que dependía todo el
   presupuesto de batería del punto 4.
2. **El namespace e instance elegidos viajan tal cual** y se leen sin ambigüedad, así
   que el `tagId` del contrato (punto 5) es implementable como está definido.
3. El plan B (seguir en iBeacon y filtrar por `setManufacturerData`, resignando el
   filtrado del ruido de los iPhone) **se descarta**.

### El tag emite además un frame propietario

El BC021 alterna el Eddystone-UID con un frame KBeacon `0x22` (KSensor, el del
acelerómetro) bajo el mismo service UUID:

```
crudo: 22 1566 DD8800001EB9 0641
                └─ la MAC del propio tag
```

Dos consecuencias:

- **Cuesta batería del tag sin aportar nada a US-30.** Desactivar ese slot alargaría la
  vida de la pila. Pero el acelerómetro puede interesarle a **US-34**, así que la
  decisión es de Simón, no unilateral.
- **Ese frame publica la MAC del tag en claro**, o sea que el tag es rastreable por
  cualquiera con un scanner, independientemente de nuestras decisiones de namespace.
  No afecta el anonimato del *detector* (que es lo que pide la historia), pero sí es una
  limitación de privacidad del hardware que vale la pena mencionar en la tesis.

El decoder del banco de pruebas ya muestra los dos frames a la vez y vuelca en hexa
los que no reconoce.

### Equipos de pruebas: qué se puede validar en cada uno

Hay dos equipos disponibles, y la diferencia entre ellos es lo que decide qué parte de
la historia se puede probar. El umbral que importa es **API 29**.

| | Moto C (API 24) | TCL 6102A (API 30) | Hace falta |
|---|---|---|---|
| Escaneo BLE (`bluetooth_le`) | sí | sí | — |
| `ACCESS_BACKGROUND_LOCATION` | no existe | **sí** | API 29+ |
| `foregroundServiceType="location"` | no existe | **sí** | API 29+ |
| Escaneo en segundo plano vía FGS | no | **sí** | API 29+ |
| Medición de batería / Doze | no | **sí** | API 29+ |
| Permiso `BLUETOOTH_SCAN` | no, camino legacy | no, camino legacy | API 31+ |
| `POST_NOTIFICATIONS` | no existe | no existe | API 33+ |
| Permiso `FOREGROUND_SERVICE_LOCATION` | no existe | no existe (se ignora) | API 34+ |
| Restricción de FGS en `BOOT_COMPLETED` | no aplica | no aplica | API 35+ |

**Moto C (API 24)**: es exactamente el `minSdk`. Sirve para validar el camino legacy de
permisos y nada más — no puede ejercitar el foreground service tipado ni el permiso de
ubicación en segundo plano, o sea nada de lo que define la historia.

**TCL 6102A, Android 11 / API 30** (verificado por `adb`: `ro.build.version.sdk=30`,
`bluetooth_le` presente): **alcanza para desarrollar la historia y para cerrar los
cuatro puntos de hardware pendientes del punto 6**, incluida la medición de consumo que
fija el umbral del criterio de aceptación. Además ejercita el escalonamiento de
`ACCESS_BACKGROUND_LOCATION` en su variante más incómoda, porque API 30 es justo donde
Android deja de mostrar diálogo y manda al usuario a Ajustes.

⚠️ **Cuidado con el boot en API 30.** En este equipo el service *sí* arranca desde
`BOOT_COMPLETED`. No hay que concluir de ahí que la reanudación automática funciona: la
restricción es de API 35+ y no se puede observar acá. Sigue valiendo la limitación
documentada al final del punto 1.

### Qué queda sin poder validarse

Solo el **segundo camino de permisos** (el de Android 12+): `BLUETOOTH_SCAN`,
`POST_NOTIFICATIONS` y el permiso `FOREGROUND_SERVICE_LOCATION`, más la restricción del
boot de API 35+.

Sigue haciendo falta un equipo API 31+ (idealmente 34+) **para cerrar la historia**,
y conviene pedirlo en la daily porque puede tardar. Pero ya no es un bloqueante para
empezar: con el TCL se desarrolla y se mide contra un foreground service real, no a
ciegas.

Aparte, el spike recomienda probar en **al menos dos marcas distintas**, porque Xiaomi,
Samsung y Huawei matan foreground services que Android puro mantiene. Ese punto queda
abierto igual.

### Pendiente de la próxima sesión con el tag

| | |
|---|---|
| RSSI @ 1 m / 10 m / 25 m / 50 m (exteriores) | |
| Batería reportada (TLM) | |
