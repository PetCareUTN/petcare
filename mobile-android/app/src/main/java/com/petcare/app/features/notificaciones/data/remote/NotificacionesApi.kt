package com.petcare.app.features.notificaciones.data.remote

import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.Path

/** Notificación interna del usuario autenticado (US-22). */
data class NotificacionResponse(
    val idNotificacion: Int,
    val tipo: String,
    val titulo: String,
    val cuerpo: String,
    val leida: Boolean,
    val fechaEnvio: String
)

interface NotificacionesApi {

    @GET("notificaciones")
    suspend fun getMisNotificaciones(): List<NotificacionResponse>

    @PATCH("notificaciones/{idNotificacion}/leer")
    suspend fun marcarLeida(@Path("idNotificacion") idNotificacion: Int)

    @PATCH("notificaciones/leer-todas")
    suspend fun marcarTodasLeidas()
}
