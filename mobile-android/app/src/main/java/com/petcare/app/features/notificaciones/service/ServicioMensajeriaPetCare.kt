package com.petcare.app.features.notificaciones.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.petcare.app.MainActivity
import com.petcare.app.R
import com.petcare.app.features.auth.data.local.SessionManager
import com.petcare.app.features.auth.data.remote.RetrofitClient
import com.petcare.app.features.notificaciones.domain.PushTokenController
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/** Claves con las que viaja el destino dentro del push y del Intent. */
object DatosPush {
    const val CANAL_ID = "petcare_avisos"
    const val TIPO = "tipo"
    const val ID_REFERENCIA = "idReferencia"
    const val TIPO_REFERENCIA = "tipoReferencia"
}

private const val TAG = "PushPetCare"

/**
 * Recibe las notificaciones push y las muestra en la bandeja del sistema.
 *
 * Se arma la notificación a mano desde `data` en vez de dejar que FCM la
 * dibuje solo: así llega igual con la app en primer plano —donde FCM no
 * muestra nada— y, sobre todo, se puede adjuntar el destino para abrir la
 * pantalla correcta al tocarla.
 */
class ServicioMensajeriaPetCare : FirebaseMessagingService() {

    override fun onMessageReceived(mensaje: RemoteMessage) {
        val titulo = mensaje.notification?.title
            ?: mensaje.data["titulo"]
            ?: getString(R.string.app_name)
        val cuerpo = mensaje.notification?.body ?: mensaje.data["cuerpo"] ?: return

        mostrar(titulo, cuerpo, mensaje.data)
    }

    /**
     * FCM rota el token por su cuenta (reinstalación, restauración, limpieza de
     * datos). Cuando pasa, el backend tiene uno que ya no sirve, así que se
     * registra el nuevo apenas llega.
     *
     * Solo tiene sentido si hay sesión abierta: el endpoint va autenticado y,
     * sin sesión, no hay a quién asociarlo.
     */
    override fun onNewToken(token: String) {
        val sessionStore = SessionManager(applicationContext)
        if (sessionStore.getSession() == null) return

        val controller = PushTokenController(
            notificacionesApi = RetrofitClient.notificacionesApi(sessionStore)
        )
        CoroutineScope(Dispatchers.IO).launch {
            controller.registrar(token)
        }
    }

    private fun mostrar(titulo: String, cuerpo: String, datos: Map<String, String>) {
        if (!tienePermiso()) {
            // Android 13+ permite rechazar las notificaciones. No es un error:
            // el aviso igual quedó guardado y se ve en la campanita de la app.
            Log.i(TAG, "Sin permiso de notificaciones: el aviso queda solo en la app")
            return
        }

        crearCanal()

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            datos[DatosPush.TIPO]?.let { putExtra(DatosPush.TIPO, it) }
            datos[DatosPush.ID_REFERENCIA]?.let { putExtra(DatosPush.ID_REFERENCIA, it) }
            datos[DatosPush.TIPO_REFERENCIA]?.let { putExtra(DatosPush.TIPO_REFERENCIA, it) }
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            // Un request code distinto por notificación para que Android no
            // reutilice el Intent de la anterior y abra la pantalla equivocada.
            datos[DatosPush.ID_REFERENCIA]?.toIntOrNull() ?: 0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notificacion = NotificationCompat.Builder(this, DatosPush.CANAL_ID)
            .setSmallIcon(R.drawable.ic_bell)
            .setContentTitle(titulo)
            .setContentText(cuerpo)
            .setStyle(NotificationCompat.BigTextStyle().bigText(cuerpo))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        NotificationManagerCompat.from(this)
            .notify(System.currentTimeMillis().toInt(), notificacion)
    }

    private fun crearCanal() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        val canal = NotificationChannel(
            DatosPush.CANAL_ID,
            "Avisos de PetCare",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Turnos, vacunas y avisos de mascotas perdidas"
        }

        getSystemService(NotificationManager::class.java)?.createNotificationChannel(canal)
    }

    private fun tienePermiso(): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED

    companion object {
        /** Lee el destino que dejó el push en el Intent, si lo trae. */
        fun destinoDe(intent: Intent?): DestinoPush? {
            val tipo = intent?.getStringExtra(DatosPush.TIPO) ?: return null
            return DestinoPush(
                tipo = tipo,
                idReferencia = intent.getStringExtra(DatosPush.ID_REFERENCIA)?.toIntOrNull(),
                tipoReferencia = intent.getStringExtra(DatosPush.TIPO_REFERENCIA)
            )
        }

        /** Evita que el mismo Intent vuelva a navegar al rotar la pantalla. */
        fun limpiarDestino(intent: Intent?) {
            intent?.removeExtra(DatosPush.TIPO)
            intent?.removeExtra(DatosPush.ID_REFERENCIA)
            intent?.removeExtra(DatosPush.TIPO_REFERENCIA)
        }
    }
}

/** Pantalla que hay que abrir al tocar un push. */
data class DestinoPush(
    val tipo: String,
    val idReferencia: Int?,
    val tipoReferencia: String?
)
