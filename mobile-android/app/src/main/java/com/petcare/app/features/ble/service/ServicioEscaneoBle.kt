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
import androidx.core.app.NotificationManagerCompat
import com.petcare.app.MainActivity
import com.petcare.app.R
import com.petcare.app.features.auth.data.local.SessionManager
import com.petcare.app.features.auth.data.remote.RetrofitClient
import com.petcare.app.features.ble.data.local.ColaboracionPreferences
import com.petcare.app.features.ble.data.local.MonitoreoSeparacionPreferences
import com.petcare.app.features.ble.domain.DeteccionesController
import com.petcare.app.features.ble.domain.DetectorDeSeparacion
import com.petcare.app.features.ble.domain.EscaneoNoDisponibleException
import com.petcare.app.features.ble.domain.MotorEscaneoBle
import com.petcare.app.features.ble.domain.TagDetectado
import com.petcare.app.features.notificaciones.data.remote.AvisarSeparacionRequest
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.isActive
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
 * **US-34 comparte este mismo escaneo** en vez de abrir uno propio: los dos consumidores
 * ([DeteccionesController] y [DetectorDeSeparacion]) procesan las mismas lecturas de
 * [MotorEscaneoBle] en paralelo. Es a proposito y no un atajo: dos escaneos corriendo
 * a la vez competirian por el mismo limite de `startScan()` de Android (ver
 * [com.petcare.app.features.ble.domain.GuardiaDeThrottle]), que es un limite de la app
 * entera y no por instancia, y ademas gastarian el doble de bateria para escanear
 * exactamente lo mismo.
 *
 * El service ahora arranca si **cualquiera** de los dos casos de uso lo necesita, no
 * solo la colaboracion: eso es lo que hace [debeEstarActivo]. Ojo con no mandar
 * detecciones al backend cuando el usuario nunca activo la colaboracion: por eso
 * [DeteccionesController.registrar] se llama detras de un chequeo de
 * [ColaboracionPreferences.estaActiva] leido en cada lectura (no una vez al arrancar
 * el escaneo), asi que activar o desactivar la colaboracion mientras el escaneo ya esta
 * corriendo por el otro motivo tiene efecto inmediato, sin reiniciar el service.
 *
 * Ver docs/spike-escaneo-ble-segundo-plano.md
 */
class ServicioEscaneoBle : Service() {

    private val preferencias by lazy { ColaboracionPreferences(this) }
    private val monitoreoSeparacion by lazy { MonitoreoSeparacionPreferences(this) }
    private val motor by lazy { MotorEscaneoBle(this) }
    private val detecciones by lazy { DeteccionesController(this) }
    private val detectorSeparacion = DetectorDeSeparacion()

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private var escaneo: Job? = null
    private var vigilanciaSeparacion: Job? = null

    override fun onCreate() {
        super.onCreate()
        crearCanalDeNotificacion()
    }

    /** No se usa con bind: se arranca y se para con startService/stopService. */
    override fun onBind(intent: Intent): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // ACCION_DETENER no corta el service por si sola: solo lo despierta para que
        // vuelva a evaluar si debeEstarActivo(). El toggle de colaboracion (ver
        // ColaboracionBleCard) ya guarda la preferencia en false antes de mandar esta
        // accion, asi que si el monitoreo de separacion sigue necesitando el escaneo,
        // el service sigue en pie por ese motivo en vez de cortarse entero.
        if (!debeEstarActivo()) {
            detenerse()
            return START_NOT_STICKY
        }

        arrancarEnPrimerPlano()
        escanear()
        vigilarSeparacion()

        // START_STICKY: si el sistema mata el proceso por memoria, que vuelva a
        // levantar el escaneo. onStartCommand va a recibir un intent nulo, y por eso la
        // condicion de arriba se apoya en las preferencias y no solo en la accion.
        return START_STICKY
    }

    /** Hay colaboracion activa (US-30), o alguna mascota con monitoreo de separacion (US-34). */
    private fun debeEstarActivo(): Boolean =
        preferencias.estaActiva() || monitoreoSeparacion.tagsMonitoreados().isNotEmpty()

    private fun escanear() {
        // Si ya hay un escaneo corriendo, no arrancar otro: onStartCommand puede
        // llegar varias veces (por ejemplo cuando el sistema revive el service, o
        // cuando se activa el segundo motivo mientras el primero ya tenia el escaneo
        // corriendo).
        if (escaneo?.isActive == true) return

        sincronizarTagsMonitoreados()

        escaneo = scope.launch {
            // Lo que haya quedado sin enviar de la sesion anterior (sin red, o porque
            // el sistema mato el proceso) se intenta mandar apenas arranca el escaneo.
            detecciones.vaciarCola()

            motor.escanear(intervaloMillis = preferencias.getIntervaloMillis())
                .catch { error ->
                    if (error is EscaneoNoDisponibleException) {
                        // Sin Bluetooth o sin permisos no tiene sentido sostener la
                        // notificacion del service: se corta y se reintenta cuando el
                        // usuario vuelva a activar alguno de los dos casos de uso.
                        Log.w(TAG, "Escaneo no disponible: ${error.motivo}")
                        detenerse()
                    } else {
                        throw error
                    }
                }
                .collect { lectura ->
                    // Leido en cada lectura (no una vez al arrancar el escaneo) para que
                    // activar/desactivar la colaboracion tenga efecto ya mismo, sin
                    // depender de que el escaneo se reinicie.
                    if (preferencias.estaActiva()) {
                        detecciones.registrar(lectura)
                    }
                    procesarSeparacion(lectura)
                }
        }
    }

    /** Da de alta en [detectorSeparacion] cualquier tag nuevo que se haya activado. */
    private fun sincronizarTagsMonitoreados() {
        val ahora = System.currentTimeMillis()
        for (tagId in monitoreoSeparacion.tagsMonitoreados()) {
            if (!detectorSeparacion.monitoreoActivo(tagId)) {
                detectorSeparacion.activarMonitoreo(tagId, ahora)
            }
        }
    }

    private fun procesarSeparacion(lectura: TagDetectado) {
        if (!detectorSeparacion.monitoreoActivo(lectura.tagId)) return

        detectorSeparacion.registrarLectura(lectura.tagId, lectura.detectadoEnMillis)
    }

    /**
     * Revisa periodicamente si algun tag monitoreado cumplio el intervalo de separacion.
     *
     * Va aparte del `collect` de lecturas a proposito: la separacion es **la ausencia de
     * lecturas**, asi que colgarla de una lectura que llega nunca la detectaria. Es lo
     * que pide el KDoc de [DetectorDeSeparacion]: `registrarLectura` por cada lectura, y
     * `evaluar` periodicamente, en cada ciclo de duty cycling.
     *
     * Se apoya en el reloj del sistema y no en el timestamp de una lectura, porque
     * justamente no hay lectura de la cual sacarlo.
     */
    private fun vigilarSeparacion() {
        if (vigilanciaSeparacion?.isActive == true) return

        vigilanciaSeparacion = scope.launch {
            while (isActive) {
                delay(preferencias.getIntervaloMillis())

                // Un tag que el usuario acaba de activar tiene que entrar en la
                // vigilancia sin esperar a que se reinicie el escaneo.
                sincronizarTagsMonitoreados()

                val ahora = System.currentTimeMillis()
                for (tagId in monitoreoSeparacion.tagsMonitoreados()) {
                    // La alerta definitiva (umbral configurable, silenciado por mascota,
                    // texto final) es US-35 (P1-174) y todavia no esta implementada.
                    // Esta notificacion es solo para probar HOY que la deteccion real
                    // funciona con el tag fisico, sin depender de tener el celular
                    // enchufado a una compu mirando el Logcat.
                    if (detectorSeparacion.separacionNuevaDetectada(tagId, ahora)) {
                        Log.i(TAG, "Separacion detectada para el tag $tagId (pendiente US-35)")
                        mostrarNotificacionDebugDeSeparacion(tagId)
                        avisarSeparacionAlBackend(tagId)
                    }
                }
            }
        }
    }

    /**
     * Deja el aviso de separacion en el historial del dueño (la campanita).
     *
     * La notificacion local de arriba es efimera: si el dueño no la ve en el
     * momento, se pierde sin dejar rastro. Esta queda, y al tocarla abre el
     * reporte de perdida de la mascota.
     *
     * A diferencia de las detecciones de US-31, que son anonimas, esto exige
     * sesion: el aviso es para el dueño. Sin sesion no se intenta siquiera.
     *
     * No se encola para reintentar si falla, a proposito: a diferencia de una
     * deteccion —que es un dato del mundo que se perderia para siempre— acá el
     * dueño ya recibio la alerta local, y un aviso de "se alejo" que aparece
     * media hora tarde confunde mas de lo que ayuda.
     */
    private fun avisarSeparacionAlBackend(tagId: String) {
        val sesion = SessionManager(this)
        if (sesion.getSession() == null) {
            Log.w(TAG, "Sin sesion: no se puede dejar el aviso de separacion en la campanita")
            return
        }

        scope.launch {
            runCatching {
                RetrofitClient.notificacionesApi(sesion)
                    .avisarSeparacion(AvisarSeparacionRequest(tagId))
            }.onFailure {
                Log.w(TAG, "No se pudo dejar el aviso de separacion en la campanita", it)
            }
        }
    }

    private fun mostrarNotificacionDebugDeSeparacion(tagId: String) {
        val notificacion = NotificationCompat.Builder(this, ID_CANAL_DEBUG_SEPARACION)
            .setContentTitle("[DEBUG US-34] Separación detectada")
            .setContentText("Hace rato que no se ve el tag $tagId")
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()

        // tagId.hashCode() como id: si hay varios tags monitoreados, cada uno tiene su
        // propia notificacion en vez de pisar la de otro.
        runCatching {
            NotificationManagerCompat.from(this).notify(tagId.hashCode(), notificacion)
        }.onFailure {
            // Sin permiso POST_NOTIFICATIONS (API 33+) no se puede mostrar: el Logcat
            // de arriba sigue sirviendo como respaldo para confirmar la deteccion.
            Log.w(TAG, "No se pudo mostrar la notificacion de debug", it)
        }
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

        // Canal aparte para la notificacion de prueba de US-34: a diferencia del de
        // arriba (silencioso, porque es obligatorio y el usuario no lo pidio), esta
        // tiene que hacerse notar para poder probarla sin mirar el celular todo el
        // tiempo. Se borra junto con mostrarNotificacionDebugDeSeparacion() cuando
        // llegue la alerta definitiva de US-35.
        val canalDebug = NotificationChannel(
            ID_CANAL_DEBUG_SEPARACION,
            "[DEBUG] Separación detectada (US-34)",
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = "Notificacion de prueba para validar la deteccion de separacion con hardware real."
        }

        getSystemService(NotificationManager::class.java)?.createNotificationChannel(canal)
        getSystemService(NotificationManager::class.java)?.createNotificationChannel(canalDebug)
    }

    private fun detenerse() {
        escaneo?.cancel()
        escaneo = null
        vigilanciaSeparacion?.cancel()
        vigilanciaSeparacion = null
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

        private const val ID_CANAL_DEBUG_SEPARACION = "petcare_debug_separacion_us34"

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
