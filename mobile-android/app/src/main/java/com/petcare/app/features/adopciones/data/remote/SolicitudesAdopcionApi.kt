package com.petcare.app.features.adopciones.data.remote

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path

data class SolicitarAdopcionRequest(
    val idPublicacion: Int
)

data class RechazarSolicitudAdopcionRequest(
    val motivoRechazo: String
)

data class SolicitudAdopcionResponse(
    val idSolicitud: Int,
    val idPublicacion: Int,
    val idMascota: Int,
    val nombreMascota: String,
    val estado: String,
    val motivoRechazo: String?,
    val createdAt: String,
    val idSolicitante: Int,
    val nombreSolicitante: String,
    val emailSolicitante: String,
    val telefonoSolicitante: String?
)

interface SolicitudesAdopcionApi {

    @POST("solicitudes-adopcion")
    suspend fun solicitar(
        @Body request: SolicitarAdopcionRequest
    ): SolicitudAdopcionResponse

    @GET("solicitudes-adopcion/recibidas")
    suspend fun listarRecibidas(): List<SolicitudAdopcionResponse>

    @PATCH("solicitudes-adopcion/{id}/aceptar")
    suspend fun aceptar(
        @Path("id") idSolicitud: Int
    ): SolicitudAdopcionResponse

    @PATCH("solicitudes-adopcion/{id}/rechazar")
    suspend fun rechazar(
        @Path("id") idSolicitud: Int,
        @Body request: RechazarSolicitudAdopcionRequest
    ): SolicitudAdopcionResponse
}
