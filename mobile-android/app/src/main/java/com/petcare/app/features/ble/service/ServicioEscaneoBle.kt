package com.petcare.app.features.ble.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.petcare.app.MainActivity
import com.petcare.app.R
import com.petcare.app.features.ble.data.local.ColaboracionPreferences
import com.petcare.app.features.ble.domain.EscaneoNoDisponibleException
import com.petcare.app.features.ble.domain.MotorEscaneoBle
import com.petcare.app.features.ble.domain.TagDetectado
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.launch

/**
 * Mantiene vivo el escaneo BLE con la app en segundo plano (US-30).
 *
 * Es un **foreground service de tipo `location`**, y no un `WorkManager` ni un service
 * comun, por dos limites de plataforma:
 *
 * - Desde Android 8 el sistema filtra los resultados de `startScan()` cuando la app no
 *   esta en primer plano: el `ScanCallback` deja de recibir entregas.
 * - `WorkManager` tiene un piso de 15 minutos, demasiado grueso para una mascota en
 *   movimiento.
 *
 * El tipo tiene que ser `location` y no `connectedDevice`, porque de la deteccion
 * derivamos la ubicacion aproximada del detector.
 *
 * **Limitacion conocida:** en Android 15+ un foreground service de tipo `location` no
 * puede arrancar desde `BOOT_COMPLETED`, asi que despues de reiniciar el telefono la
 * colaboracion no se reanuda sola hasta que el usuario abra la app. Es limite de
 * plataforma; la alternativa (`connectedDevice`) dejaria la deteccion sin coordenadas y
 * rompe el criterio de aceptacion de US-31.
 *
 * El service no sabe escanear: eso es [MotorEscaneoBle], que vive en `domain` para que
 * US-34 lo pueda usar sin arrastrar el service.
 *
 * Ver docs/spike-escaneo-ble-segundo-plano.md
 */
class ServicioEscaneoBle : Service() {

    private val preferencias by lazy { ColaboracionPreferences(this) }
    private val motor by lazy { MotorEscaneoBle(this) }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private var escaneo: Job? = null

    override fun onCreate() {
        super.onCreate()
        crearCanalDeNotificacion()
    }

    /** No se usa con bind: se arranca y se para con startService/stopService. */
    override fun onBind(intent: Intent): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACCION_DETENER || !preferencias.estaActiva()) {
            detenerse()
            return START_NOT_STICKY
        }

        arrancarEnPrimerPlano()
        escanear()

        // START_STICKY: si el sistema mata el proceso por memoria, que vuelva a
        // levantar la colaboracion. onStartCommand va a recibir un intent nulo, y por
        // eso la condicion de arriba se apoya en la preferencia y no solo en la accion.
        return START_STICKY
    }

    private fun escanear() {
        // Si ya hay un escaneo corriendo, no arrancar otro: onStartCommand puede
        // llegar varias veces (por ejemplo cuando el sistema revive el service).
        if (escaneo?.isActive == true) return

        escaneo = scope.launch {
            motor.escanear(intervaloMillis = preferencias.getIntervaloMillis())
                .catch { error ->
                    if (error is EscaneoNoDisponibleException) {
                        // Sin Bluetooth o sin permisos no tiene sentido sostener la
                        // notificacion del service: se corta y se reintenta cuando el
                        // usuario vuelva a activarlo.
                        Log.w(TAG, "Escaneo no disponible: ${error.motivo}")
                        detenerse()
                    } else {
                        throw error
                    }
                }
                .collect { registrar(it) }
        }
    }

    /**
     * Por ahora solo deja la deteccion en el log.
     *
     * El armado del payload (deteccionId, coordenadas redondeadas a 3 decimales) y el
     * envio a `POST /detecciones` van en el proximo commit: necesitan la cola de envio
     * offline y una instancia de Retrofit sin `AuthTokenInterceptor`, porque el endpoint
     * es anonimo por diseño.
     */
    private fun registrar(deteccion: TagDetectado) {
        Log.d(
            TAG,
            "Tag ${deteccion.tagId} · RSSI ${deteccion.rssi} dBm · " +
                "~${"%.1f".format(deteccion.distanciaAproximadaMetros)} m",
        )
    }

    private fun arrancarEnPrimerPlano() {
        val notificacion = construirNotificacion()

        // El tipo del foreground service se declara en el manifest desde API 29, pero
        // desde API 29 tambien se puede (y conviene) repetirlo aca.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                ID_NOTIFICACION,
                notificacion,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION,
            )
        } else {
            startForeground(ID_NOTIFICACION, notificacion)
        }
    }

    private fun construirNotificacion(): Notification {
        val abrirApp = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE,
        )

        return NotificationCompat.Builder(this, ID_CANAL)
            .setContentTitle(getString(R.string.ble_notificacion_titulo))
            .setContentText(getString(R.string.ble_notificacion_texto))
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setContentIntent(abrirApp)
            .setOngoing(true)
            // La notificacion es obligatoria y el usuario no la pidio: lo mas discreta
            // posible, sin sonido ni vibracion.
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setSilent(true)
            .build()
    }

    private fun crearCanalDeNotificacion() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        val canal = NotificationChannel(
            ID_CANAL,
            getString(R.string.ble_canal_nombre),
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = getString(R.string.ble_canal_descripcion)
            setShowBadge(false)
        }

        getSystemService(NotificationManager::class.java)?.createNotificationChannel(canal)
    }

    private fun detenerse() {
        escaneo?.cancel()
        escaneo = null
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }

    companion object {
        private const val TAG = "ServicioEscaneoBle"

        private const val ID_CANAL = "petcare_colaboracion_ble"
        private const val ID_NOTIFICACION = 1001

        private const val ACCION_DETENER = "com.petcare.app.ble.DETENER"

        /**
         * Arranca la colaboracion.
         *
         * Asume que el usuario ya concedio los permisos: el motor corta con
         * [EscaneoNoDisponibleException] si falta alguno, y el service se apaga solo.
         */
        fun iniciar(context: Context) {
            val intent = Intent(context, ServicioEscaneoBle::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        /** Corta la colaboracion. Es lo que dispara el toggle de configuracion. */
        fun detener(context: Context) {
            context.startService(
                Intent(context, ServicioEscaneoBle::class.java).setAction(ACCION_DETENER)
            )
        }
    }
}
