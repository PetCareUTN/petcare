package com.petcare.app.features.adopciones.data.remote

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path

data class SolicitarAdopcionRequest(
    val idPublicacion: Int,
    val tipoVivienda: String? = null,
    val tienePatio: Boolean? = null,
    val tieneOtrasMascotas: Boolean? = null,
    val tieneNinos: Boolean? = null,
    val tuvoMascotasAntes: Boolean? = null,
    val motivo: String? = null,
    val informacionAdicional: String? = null
)

data class RechazarSolicitudAdopcionRequest(
    val motivoRechazo: String
)

data class SolicitudAdopcionResponse(
    val idSolicitud: Int,
    val idPublicacion: Int,
    val idMascota: Int,
    val nombreMascota: String,
    val fotoMascota: String?,
    val estado: String,
    val motivoRechazo: String?,
    val tipoVivienda: String?,
    val tienePatio: Boolean?,
    val tieneOtrasMascotas: Boolean?,
    val tieneNinos: Boolean?,
    val tuvoMascotasAntes: Boolean?,
    val motivo: String?,
    val informacionAdicional: String?,
    val createdAt: String,
    val idSolicitante: Int,
    val nombreSolicitante: String,
    val emailSolicitante: String,
    val telefonoSolicitante: String?,
    val idDuenio: Int,
    val nombreDuenio: String,
    val emailDuenio: String?,
    val telefonoDuenio: String?
)

interface SolicitudesAdopcionApi {

    @POST("solicitudes-adopcion")
    suspend fun solicitar(
        @Body request: SolicitarAdopcionRequest
    ): SolicitudAdopcionResponse

    @GET("solicitudes-adopcion/recibidas")
    suspend fun listarRecibidas(): List<SolicitudAdopcionResponse>

    @GET("solicitudes-adopcion/mis-solicitudes")
    suspend fun listarMisSolicitudes(): List<SolicitudAdopcionResponse>

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
