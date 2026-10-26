package com.petcare.app.features.notificaciones.domain

import android.util.Log
import com.google.firebase.messaging.FirebaseMessaging
import com.petcare.app.features.notificaciones.data.remote.NotificacionesApi
import com.petcare.app.features.notificaciones.data.remote.RegistrarDispositivoRequest
import kotlin.coroutines.resume
import kotlinx.coroutines.suspendCancellableCoroutine

private const val TAG = "PushToken"

/**
 * Alta y baja del token de FCM de este dispositivo.
 *
 * Ninguna de las dos operaciones falla hacia afuera: el push es un canal extra
 * y nada de lo que hace el usuario —iniciar o cerrar sesión— tiene que romperse
 * porque no se pudo hablar con FCM o con el backend. Si el alta no sale, las
 * notificaciones internas se siguen viendo en la campanita, que es justo lo que
 * pide el criterio de aceptación para quien rechaza el permiso.
 */
class PushTokenController(
    private val notificacionesApi: NotificacionesApi,
    private val firebaseMessaging: () -> FirebaseMessaging = { FirebaseMessaging.getInstance() }
) {

    /** Registra el token actual contra la sesión abierta. */
    suspend fun registrar() {
        val token = obtenerToken() ?: return
        registrar(token)
    }

    suspend fun registrar(token: String) {
        runCatching {
            notificacionesApi.registrarDispositivo(RegistrarDispositivoRequest(token))
        }.onFailure { Log.w(TAG, "No se pudo registrar el dispositivo", it) }
    }

    /**
     * Da de baja el dispositivo. Hay que llamarlo **antes** de borrar la sesión:
     * el endpoint va autenticado, así que sin token de sesión el backend no
     * sabría de quién dar de baja el dispositivo.
     */
    suspend fun darDeBaja() {
        val token = obtenerToken() ?: return
        runCatching {
            notificacionesApi.eliminarDispositivo(RegistrarDispositivoRequest(token))
        }.onFailure { Log.w(TAG, "No se pudo dar de baja el dispositivo", it) }
    }

    /**
     * Devuelve null si FCM no puede dar un token (sin Google Play Services, sin
     * red la primera vez). No es un error que haya que mostrar: simplemente no
     * hay push en ese dispositivo.
     */
    private suspend fun obtenerToken(): String? =
        suspendCancellableCoroutine { continuation ->
            runCatching {
                firebaseMessaging().token
                    .addOnSuccessListener { token ->
                        if (continuation.isActive) continuation.resume(token)
                    }
                    .addOnFailureListener { error ->
                        Log.w(TAG, "FCM no devolvió token", error)
                        if (continuation.isActive) continuation.resume(null)
                    }
            }.onFailure {
                Log.w(TAG, "FCM no disponible", it)
                if (continuation.isActive) continuation.resume(null)
            }
        }
}
