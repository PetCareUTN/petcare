package com.petcare.app.features.adopciones.domain

import com.petcare.app.features.adopciones.data.remote.RechazarSolicitudAdopcionRequest
import com.petcare.app.features.adopciones.data.remote.SolicitarAdopcionRequest
import com.petcare.app.features.adopciones.data.remote.SolicitudAdopcionResponse
import com.petcare.app.features.adopciones.data.remote.SolicitudesAdopcionApi

class SolicitudesAdopcionController(
    private val solicitudesAdopcionApi: SolicitudesAdopcionApi
) {

    suspend fun solicitar(request: SolicitarAdopcionRequest): SolicitudAdopcionResponse =
        solicitudesAdopcionApi.solicitar(request)

    suspend fun listarRecibidas(): List<SolicitudAdopcionResponse> =
        solicitudesAdopcionApi.listarRecibidas()

    suspend fun listarMisSolicitudes(): List<SolicitudAdopcionResponse> =
        solicitudesAdopcionApi.listarMisSolicitudes()

    suspend fun aceptar(idSolicitud: Int): SolicitudAdopcionResponse =
        solicitudesAdopcionApi.aceptar(idSolicitud)

    suspend fun rechazar(idSolicitud: Int, motivoRechazo: String): SolicitudAdopcionResponse =
        solicitudesAdopcionApi.rechazar(idSolicitud, RechazarSolicitudAdopcionRequest(motivoRechazo))
}
