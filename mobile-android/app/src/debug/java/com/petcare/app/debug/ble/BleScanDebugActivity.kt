package com.petcare.app.debug.ble

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothManager
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.os.Build
import android.os.Bundle
import android.os.ParcelUuid
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.MultiplePermissionsState
import com.google.accompanist.permissions.rememberMultiplePermissionsState
import com.petcare.app.features.ble.domain.APPLE_COMPANY_ID
import com.petcare.app.features.ble.domain.BeaconFrame
import com.petcare.app.features.ble.domain.EDDYSTONE_SERVICE_UUID
import com.petcare.app.features.ble.domain.clave
import com.petcare.app.features.ble.domain.decodificarEddystone
import com.petcare.app.features.ble.domain.decodificarIBeacon
import com.petcare.app.features.ble.domain.estimarDistanciaMetros
import com.petcare.app.ui.theme.PetCareTheme
import java.util.concurrent.TimeUnit

/**
 * Banco de pruebas del spike US-30: escanea BLE en primer plano y muestra crudo lo
 * que emite cada dispositivo cercano.
 *
 * Sirve para contestar tres preguntas del spike con el tag Blue Charm BC021 en la mano:
 *
 *  1. Con que formato viene configurado de fabrica (iBeacon o Eddystone).
 *  2. Cuales son su namespace e instance una vez configurado como Eddystone-UID
 *     (el instance es el `tagId` del contrato de deteccion).
 *  3. Que RSSI real da a distintas distancias, para calibrar el alcance util.
 *
 * NO es el motor de escaneo definitivo: escanea solo en primer plano, sin foreground
 * service, sin duty cycling y sin envio al backend. Todo eso es el Paso 2 de la
 * historia. Este Activity vive en el sourceSet `debug` y se borra al terminar el spike.
 *
 * Ver docs/spike-escaneo-ble-segundo-plano.md
 */
class BleScanDebugActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            PetCareTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background,
                ) {
                    PantallaScanDebug()
                }
            }
        }
    }
}

/**
 * Una lectura acumulada por dispositivo.
 *
 * `frames` se indexa por tipo de frame y NO se reemplaza en cada paquete: un beacon
 * puede alternar varios formatos entre advertisements (el BC021 Pro tiene 5 slots
 * simultaneos), y quedarse solo con el ultimo esconderia justo el que interesa.
 */
private data class Lectura(
    val direccion: String,
    val nombre: String?,
    val rssi: Int,
    val frames: Map<String, BeaconFrame>,
    val vistoUltimaVezMs: Long,
    val vecesVisto: Int,
)

@OptIn(ExperimentalPermissionsApi::class)
@Composable
private fun PantallaScanDebug() {
    val permisos = rememberMultiplePermissionsState(permisosNecesarios())

    Scaffold { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            if (permisos.allPermissionsGranted) {
                Scanner()
            } else {
                SolicitudDePermisos(permisos)
            }
        }
    }
}

/**
 * En API <= 30 el escaneo BLE exige ACCESS_FINE_LOCATION; desde API 31 se pide
 * BLUETOOTH_SCAN, y FINE_LOCATION sigue haciendo falta porque NO declaramos el flag
 * neverForLocation (derivamos ubicacion a proposito).
 *
 * ACCESS_BACKGROUND_LOCATION no se pide aca: este banco de pruebas escanea solo en
 * primer plano, y ese permiso necesita un flujo escalonado aparte (ver el spike).
 */
private fun permisosNecesarios(): List<String> = buildList {
    add(Manifest.permission.ACCESS_FINE_LOCATION)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        add(Manifest.permission.BLUETOOTH_SCAN)
    }
}

@OptIn(ExperimentalPermissionsApi::class)
@Composable
private fun SolicitudDePermisos(permisos: MultiplePermissionsState) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Permisos necesarios", style = MaterialTheme.typography.titleLarge)
        Text(
            "Para escanear BLE hacen falta Bluetooth y ubicacion precisa. " +
                "Si ya los rechazaste dos veces, Android no vuelve a preguntar: " +
                "hay que habilitarlos a mano desde Ajustes > Apps > PetCare > Permisos.",
            style = MaterialTheme.typography.bodyMedium,
        )
        Button(onClick = { permisos.launchMultiplePermissionRequest() }) {
            Text("Conceder permisos")
        }
    }
}

@SuppressLint("MissingPermission") // Los permisos se verifican antes de llegar aca.
@Composable
private fun Scanner() {
    val context = LocalContext.current
    val scanner = remember {
        context.getSystemService(BluetoothManager::class.java)
            ?.adapter
            ?.bluetoothLeScanner
    }

    var escaneando by remember { mutableStateOf(false) }
    var soloEddystone by remember { mutableStateOf(false) }
    // El filtro se congela al arrancar la corrida: mover el switch NO reinicia el
    // escaneo. Android bloquea a las apps que llaman startScan mas de 5 veces en 30
    // segundos, y lo hace en silencio (sin onScanFailed, sin resultados), asi que
    // reiniciar automaticamente hacia muy facil quedarse sin ver nada.
    var filtroDeLaCorrida by remember { mutableStateOf(false) }
    val lecturas = remember { mutableStateMapOf<String, Lectura>() }

    if (scanner == null) {
        Text(
            "No hay escaner BLE disponible. Revisa que el Bluetooth este encendido " +
                "(Android no expone el scanner con el BT apagado) y que el dispositivo " +
                "soporte Bluetooth LE. El emulador no tiene radio BLE real.",
            style = MaterialTheme.typography.bodyMedium,
        )
        return
    }

    // Se reinicia el escaneo cuando cambia el filtro, para poder comparar en vivo
    // cuanto ruido saca el ScanFilter por service UUID.
    DisposableEffect(escaneando) {
        val callback = if (escaneando) {
            object : ScanCallback() {
                override fun onScanResult(callbackType: Int, result: ScanResult) {
                    val registro = result.scanRecord
                    val frames = buildList {
                        registro?.serviceData
                            ?.get(ParcelUuid.fromString(EDDYSTONE_SERVICE_UUID))
                            ?.let { add(decodificarEddystone(it)) }

                        registro?.manufacturerSpecificData
                            ?.get(APPLE_COMPANY_ID)
                            ?.let { datos -> decodificarIBeacon(datos)?.let { add(it) } }
                    }
                    val direccion = result.device.address
                    val previa = lecturas[direccion]
                    lecturas[direccion] = Lectura(
                        direccion = direccion,
                        nombre = registro?.deviceName ?: previa?.nombre,
                        rssi = result.rssi,
                        // Se acumulan por tipo: los frames nuevos actualizan el suyo y
                        // dejan intactos los demas formatos vistos antes.
                        frames = (previa?.frames ?: emptyMap()) + frames.associateBy { it.clave() },
                        vistoUltimaVezMs = System.currentTimeMillis(),
                        vecesVisto = (previa?.vecesVisto ?: 0) + 1,
                    )
                }

                override fun onScanFailed(errorCode: Int) {
                    lecturas["error"] = Lectura(
                        direccion = "Fallo el escaneo (codigo $errorCode)",
                        nombre = null,
                        rssi = 0,
                        frames = emptyMap(),
                        vistoUltimaVezMs = System.currentTimeMillis(),
                        vecesVisto = 1,
                    )
                }
            }
        } else {
            null
        }

        if (callback != null) {
            val filtros = if (filtroDeLaCorrida) {
                // Filtro que propone el spike. Cuando definamos el namespace de la flota
                // PetCare se le suma setServiceData(uuid, data, mask) para que el chip
                // descarte tambien los Eddystone ajenos.
                listOf(
                    ScanFilter.Builder()
                        .setServiceUuid(ParcelUuid.fromString(EDDYSTONE_SERVICE_UUID))
                        .build()
                )
            } else {
                emptyList()
            }

            // LOW_LATENCY solo para el banco de pruebas: queremos ver todo al instante.
            // El motor definitivo usa LOW_POWER + duty cycling (ver el spike).
            val settings = ScanSettings.Builder()
                .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
                .build()

            scanner.startScan(filtros, settings, callback)
        }

        onDispose { callback?.let { scanner.stopScan(it) } }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        Text("Scanner BLE — spike US-30", style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.height(12.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Button(onClick = {
                if (escaneando) {
                    escaneando = false
                } else {
                    lecturas.clear()
                    filtroDeLaCorrida = soloEddystone
                    escaneando = true
                }
            }) {
                Text(if (escaneando) "Detener" else "Escanear")
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Solo Eddystone", style = MaterialTheme.typography.bodyMedium)
                Switch(checked = soloEddystone, onCheckedChange = { soloEddystone = it })
            }
        }

        Spacer(Modifier.height(8.dp))
        Text(
            "${lecturas.size} dispositivos" +
                if (escaneando && filtroDeLaCorrida) " (filtrando por 0xFEAA)" else "",
            style = MaterialTheme.typography.labelLarge,
        )

        if (escaneando && soloEddystone != filtroDeLaCorrida) {
            Spacer(Modifier.height(4.dp))
            Text(
                "El switch cambio: tocá Detener y Escanear de nuevo para aplicarlo.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.primary,
            )
        }

        if (escaneando && lecturas.isEmpty()) {
            Spacer(Modifier.height(8.dp))
            Text(
                "Sin resultados todavia.\n\n" +
                    "Si reiniciaste el escaneo varias veces seguidas, Android bloquea a " +
                    "la app por pasarse de 5 inicios en 30 segundos, y lo hace en " +
                    "silencio. Esperá un minuto, o apagá y prendé el Bluetooth desde el " +
                    "panel de notificaciones, y volvé a tocar Escanear.",
                style = MaterialTheme.typography.bodySmall,
            )
        }

        Spacer(Modifier.height(8.dp))

        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(lecturas.values.sortedByDescending { it.rssi }, key = { it.direccion }) {
                TarjetaLectura(it)
            }
        }
    }
}

@Composable
private fun TarjetaLectura(lectura: Lectura) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(
                lectura.nombre ?: lectura.direccion,
                style = MaterialTheme.typography.titleSmall,
            )
            Text(
                "${lectura.direccion} · RSSI ${lectura.rssi} dBm · ${lectura.vecesVisto} paquetes",
                style = MaterialTheme.typography.bodySmall,
                fontFamily = FontFamily.Monospace,
            )

            lectura.frames.values.forEach { frame ->
                Spacer(Modifier.height(6.dp))
                Text(
                    describir(frame, lectura.rssi),
                    style = MaterialTheme.typography.bodySmall,
                    fontFamily = FontFamily.Monospace,
                    color = MaterialTheme.colorScheme.primary,
                )
            }
        }
    }
}

private fun describir(frame: BeaconFrame, rssi: Int): String = when (frame) {
    is BeaconFrame.EddystoneUid -> buildString {
        appendLine("EDDYSTONE-UID  ← este es el formato que queremos")
        appendLine("  namespace : ${frame.namespace}")
        appendLine("  instance  : ${frame.instance}   ← tagId del contrato")
        append(
            "  ~distancia: %.1f m  (txPower %d dBm @0m)"
                .format(estimarDistanciaMetros(rssi, frame.txPowerA1Metro), frame.txPower)
        )
    }

    is BeaconFrame.EddystoneTlm -> buildString {
        appendLine("EDDYSTONE-TLM")
        appendLine("  bateria   : ${frame.bateriaMilliVolts} mV")
        appendLine("  temp      : %.1f C".format(frame.temperaturaCelsius))
        append("  encendido : ${TimeUnit.SECONDS.toHours(frame.encendidoHaceSegundos)} h")
    }

    is BeaconFrame.EddystoneUrl -> "EDDYSTONE-URL (no lo usamos)"

    is BeaconFrame.IBeacon -> buildString {
        appendLine("IBEACON  ← reconfigurar a Eddystone-UID")
        appendLine("  uuid      : ${frame.proximityUuid}")
        append("  major/minor: ${frame.major} / ${frame.minor}")
    }

    is BeaconFrame.Desconocido -> buildString {
        appendLine(frame.descripcion)
        append("  crudo: ${frame.hexCrudo}")
    }
}
