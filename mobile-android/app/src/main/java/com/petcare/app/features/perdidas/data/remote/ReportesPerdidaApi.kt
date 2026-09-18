package com.petcare.app.features.perdidas.data.remote

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path

/** Reporte de mascota perdida del dueño autenticado (US-36). */
data class ReportePerdidaResponse(
    val idReporte: Int,
    val idMascota: Int,
    val nombreMascota: String?,
    val fotoMascota: String?,
    val estado: String,
    val fechaPerdida: String,
    val latitud: Double,
    val longitud: Double,
    val descripcion: String?,
    val contacto: String?,
    val fechaCierre: String?
)

data class CreateReportePerdidaRequest(
    val idMascota: Int,
    val fechaPerdida: String,
    val latitud: Double,
    val longitud: Double,
    val descripcion: String?,
    val contacto: String?
)

interface ReportesPerdidaApi {

    @POST("reportes-perdida")
    suspend fun reportar(
        @Body request: CreateReportePerdidaRequest
    ): ReportePerdidaResponse

    /** Reportes abiertos de todas las mascotas del usuario. */
    @GET("reportes-perdida/mios")
    suspend fun getMisReportesActivos(): List<ReportePerdidaResponse>

    @PATCH("reportes-perdida/{idReporte}/cerrar")
    suspend fun cerrar(
        @Path("idReporte") idReporte: Int
    ): ReportePerdidaResponse
}
