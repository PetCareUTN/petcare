package com.petcare.app.features.ble.domain

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothManager
import android.bluetooth.le.BluetoothLeScanner
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.ParcelUuid
import android.util.Log
import androidx.core.content.ContextCompat
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.channelFlow

/** Por que no se puede escanear ahora mismo. */
enum class MotivoNoDisponible {
    /** El equipo no tiene radio BLE. */
    SIN_HARDWARE_BLE,

    /** El Bluetooth esta apagado, o el adaptador no esta disponible. */
    BLUETOOTH_APAGADO,

    /** Falta algun permiso de los que exige el nivel de API del equipo. */
    SIN_PERMISOS,
}

/** El escaneo no se puede iniciar. Trae el [motivo] para poder avisarle al usuario. */
class EscaneoNoDisponibleException(
    val motivo: MotivoNoDisponible,
) : IllegalStateException("No se puede escanear: $motivo")

/**
 * Motor de escaneo BLE de tags PetCare (US-30).
 *
 * Vive en `domain` y **fuera del foreground service** a proposito: US-34 (deteccion de
 * separacion por Bluetooth) comparte esta pieza y no necesita el service. El service se
 * limita a mantener el proceso vivo y a llamar a [escanear].
 *
 * Todo lo que define el presupuesto de bateria esta aca:
 *
 * - `ScanFilter` por service UUID `0xFEAA` **mas la mascara del namespace PetCare**, de
 *   forma que el descarte lo haga el chip Bluetooth sin despertar el CPU. Es la decision
 *   que mas impacta el consumo: en el banco de pruebas la misma escena paso de 8
 *   dispositivos a 1.
 * - `SCAN_MODE_LOW_POWER` como modo base.
 * - Duty cycling con ventana e intervalo configurables, acotado por [GuardiaDeThrottle].
 *
 * Ver docs/spike-escaneo-ble-segundo-plano.md
 */
class MotorEscaneoBle(
    private val context: Context,
    private val guardia: GuardiaDeThrottle = GuardiaDeThrottle(),
) {

    /**
     * Emite cada lectura de un tag de la flota PetCare, hasta que se cancele el Flow.
     *
     * El duty cycling alterna [ventanaMillis] de escaneo cada [intervaloMillis]. La
     * ventana tiene que ser comodamente mayor al intervalo de advertising del tag
     * (1 s de fabrica), asi que 5 s da varias chances de capturarlo.
     *
     * Lanza [EscaneoNoDisponibleException] si no estan dadas las condiciones. No
     * reintenta solo: reaccionar a que el usuario prenda el Bluetooth o conceda un
     * permiso es responsabilidad de quien consume el Flow.
     */
    // Los permisos se verifican en obtenerScanner(), que corre antes de cualquier
    // startScan y corta con EscaneoNoDisponibleException. Lint no puede seguir esa
    // indireccion.
    @SuppressLint("MissingPermission")
    fun escanear(
        ventanaMillis: Long = VENTANA_ESCANEO_MILLIS,
        intervaloMillis: Long = INTERVALO_ESCANEO_MILLIS,
    ): Flow<TagDetectado> = channelFlow {
        val scanner = obtenerScanner()

        val callback = object : ScanCallback() {
            override fun onScanResult(callbackType: Int, result: ScanResult?) {
                result ?: return
                aTagDetectado(result)?.let { trySend(it) }
            }

            override fun onBatchScanResults(results: MutableList<ScanResult>?) {
                results?.forEach { resultado ->
                    aTagDetectado(resultado)?.let { trySend(it) }
                }
            }

            override fun onScanFailed(errorCode: Int) {
                Log.w(TAG, "onScanFailed: $errorCode")
                // SCAN_FAILED_ALREADY_STARTED no es fatal: ya hay un escaneo corriendo
                // con estos mismos parametros, asi que los resultados van a llegar igual.
                if (errorCode != SCAN_FAILED_ALREADY_STARTED) {
                    close(EscaneoNoDisponibleException(MotivoNoDisponible.BLUETOOTH_APAGADO))
                }
            }
        }

        val intervaloReal = intervaloMillis.coerceAtLeast(
            GuardiaDeThrottle.INTERVALO_MINIMO_MILLIS
        )
        if (intervaloMillis < intervaloReal) {
            Log.w(TAG, "Intervalo $intervaloMillis ms por debajo del piso; se usa $intervaloReal ms")
        }

        var escaneando = false
        try {
            while (true) {
                val espera = guardia.esperaNecesariaMillis(System.currentTimeMillis())
                if (espera > 0) {
                    Log.d(TAG, "Throttle: esperando $espera ms antes de reiniciar el escaneo")
                    delay(espera)
                }

                scanner.startScan(filtrosDeLaFlota(), ajustesDeEscaneo(), callback)
                guardia.registrarInicio(System.currentTimeMillis())
                escaneando = true

                delay(ventanaMillis)

                scanner.stopScan(callback)
                escaneando = false

                // Lo que queda del ciclo, con la radio apagada.
                delay((intervaloReal - ventanaMillis).coerceAtLeast(0L))
            }
        } finally {
            // Corre tambien si se cancela el Flow en medio de la ventana de escaneo,
            // que es el caso normal: el bucle de arriba no termina solo.
            if (escaneando) {
                runCatching { scanner.stopScan(callback) }
            }
        }
    }

    /**
     * `true` si estan todos los permisos que el nivel de API del equipo exige.
     *
     * Son dos caminos distintos por el rango `minSdk 24` → `targetSdk 36`:
     * en API 31+ el escaneo se habilita con `BLUETOOTH_SCAN`; por debajo, con los
     * permisos normales `BLUETOOTH`/`BLUETOOTH_ADMIN` **mas** `ACCESS_FINE_LOCATION`
     * en runtime.
     *
     * Ojo: esto NO cubre `ACCESS_BACKGROUND_LOCATION`, que hace falta aparte para que
     * el escaneo siga con la app cerrada y se pide en un flujo escalonado propio.
     */
    fun tienePermisosDeEscaneo(): Boolean {
        val requeridos = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            listOf(Manifest.permission.BLUETOOTH_SCAN)
        } else {
            listOf(Manifest.permission.ACCESS_FINE_LOCATION)
        }

        return requeridos.all { permiso ->
            ContextCompat.checkSelfPermission(context, permiso) ==
                PackageManager.PERMISSION_GRANTED
        }
    }

    private fun obtenerScanner(): BluetoothLeScanner {
        if (!context.packageManager.hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE)) {
            throw EscaneoNoDisponibleException(MotivoNoDisponible.SIN_HARDWARE_BLE)
        }
        if (!tienePermisosDeEscaneo()) {
            throw EscaneoNoDisponibleException(MotivoNoDisponible.SIN_PERMISOS)
        }

        val adaptador = context.getSystemService(BluetoothManager::class.java)?.adapter
            ?: throw EscaneoNoDisponibleException(MotivoNoDisponible.BLUETOOTH_APAGADO)

        // bluetoothLeScanner devuelve null con el Bluetooth apagado, aunque el
        // adaptador exista.
        if (!adaptador.isEnabled) {
            throw EscaneoNoDisponibleException(MotivoNoDisponible.BLUETOOTH_APAGADO)
        }

        return adaptador.bluetoothLeScanner
            ?: throw EscaneoNoDisponibleException(MotivoNoDisponible.BLUETOOTH_APAGADO)
    }

    private fun aTagDetectado(resultado: ScanResult): TagDetectado? {
        val serviceData = resultado.scanRecord
            ?.getServiceData(ParcelUuid.fromString(EDDYSTONE_SERVICE_UUID))
            ?: return null

        val frame = decodificarEddystone(serviceData) as? BeaconFrame.EddystoneUid
            ?: return null

        // Redundante con la mascara del ScanFilter, pero el filtrado por hardware no
        // esta garantizado en todos los chips: algunos lo emulan en software y otros
        // lo ignoran. Sale barato confirmarlo.
        if (!frame.esDeLaFlotaPetCare()) return null

        return TagDetectado(
            tagId = frame.instance,
            rssi = resultado.rssi,
            detectadoEnMillis = System.currentTimeMillis(),
            txPower = frame.txPower,
        )
    }

    companion object {
        private const val TAG = "MotorEscaneoBle"

        /** `ScanCallback.SCAN_FAILED_ALREADY_STARTED`, que es API 21 pero no es publico como constante util. */
        private const val SCAN_FAILED_ALREADY_STARTED = 1

        /**
         * Ventana de escaneo. Tiene que ser comodamente mayor al intervalo de
         * advertising del tag (1022,5 ms de fabrica) para tener varias chances de
         * capturarlo.
         */
        const val VENTANA_ESCANEO_MILLIS = 5_000L

        /**
         * Intervalo entre ventanas. Valor de arranque: el definitivo sale de medir
         * consumo en dispositivo fisico (punto 6 del spike).
         */
        const val INTERVALO_ESCANEO_MILLIS = 60_000L

        /**
         * Filtros que aplica el chip Bluetooth.
         *
         * Matchea el service data de `0xFEAA` contra:
         * - byte 0 = `0x00`, el tipo de frame Eddystone-UID;
         * - byte 1 = el txPower, **ignorado** via mascara en cero;
         * - bytes 2..11 = el namespace de la flota PetCare.
         *
         * El instance (bytes 12..17) queda fuera del filtro: es justamente lo que
         * cambia de tag en tag.
         */
        fun filtrosDeLaFlota(): List<ScanFilter> {
            val namespace = requireNotNull(hexABytes(NAMESPACE_PETCARE)) {
                "NAMESPACE_PETCARE no es hexadecimal valido"
            }

            val datos = ByteArray(2 + LARGO_NAMESPACE_BYTES)
            val mascara = ByteArray(2 + LARGO_NAMESPACE_BYTES)

            datos[0] = 0x00 // frame Eddystone-UID
            mascara[0] = 0xFF.toByte()

            datos[1] = 0x00 // txPower
            mascara[1] = 0x00 // ...que no nos importa para filtrar

            namespace.copyInto(datos, destinationOffset = 2)
            mascara.fill(0xFF.toByte(), fromIndex = 2)

            return listOf(
                ScanFilter.Builder()
                    .setServiceData(ParcelUuid.fromString(EDDYSTONE_SERVICE_UUID), datos, mascara)
                    .build()
            )
        }

        /**
         * `SCAN_MODE_LOW_POWER` es el modo base: el chip cicla del orden de 0,5 s de
         * escaneo cada 5 s por su cuenta, encima de nuestro propio duty cycling.
         *
         * El banco de pruebas del spike usa `SCAN_MODE_LOW_LATENCY` porque ahi el
         * objetivo es ver el tag rapido con la pantalla prendida; aca el objetivo es
         * durar todo el dia.
         */
        fun ajustesDeEscaneo(): ScanSettings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_POWER)
            .build()
    }
}
