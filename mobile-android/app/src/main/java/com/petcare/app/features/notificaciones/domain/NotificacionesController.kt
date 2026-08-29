package com.petcare.app.features.notificaciones.domain

import com.petcare.app.features.notificaciones.data.remote.NotificacionResponse
import com.petcare.app.features.notificaciones.data.remote.NotificacionesApi

class NotificacionesController(
    private val notificacionesApi: NotificacionesApi
) {

    /**
     * Notificaciones del usuario autenticado. El backend ya las filtra por
     * usuario y las devuelve de la más reciente a la más antigua.
     */
    suspend fun getMisNotificaciones(): List<NotificacionResponse> =
        notificacionesApi.getMisNotificaciones()

    suspend fun marcarLeida(idNotificacion: Int) =
        notificacionesApi.marcarLeida(idNotificacion)

    suspend fun marcarTodasLeidas() =
        notificacionesApi.marcarTodasLeidas()
}
