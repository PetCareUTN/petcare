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

/**
 * Última ubicación conocida de una mascota perdida (US-37).
 *
 * `ultimaDeteccion` en null no es un error: es el reporte que todavía nadie
 * cruzó. La pantalla lo muestra como estado vacío.
 */
data class UltimaDeteccionResponse(
    val idReporte: Int,
    val idMascota: Int,
    val nombreMascota: String?,
    val ultimaDeteccion: DeteccionResponse?
)

data class DeteccionResponse(
    val latitud: Double,
    val longitud: Double,
    /** Precisión que reportó el GPS del celular que la detectó. */
    val precisionMetros: Int,
    /** Radio a dibujar en el mapa: GPS + el margen del redondeo de coordenadas. */
    val radioAproximadoMetros: Int,
    val detectadoEn: String
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

    /**
     * Última detección del reporte (US-37). Cuelga de `/detecciones` porque es
     * el módulo dueño del dato, pero a diferencia de la ingesta anónima esta
     * consulta va autenticada: solo el dueño puede ver dónde está su mascota.
     */
    @GET("detecciones/reporte/{idReporte}/ultima")
    suspend fun getUltimaDeteccion(
        @Path("idReporte") idReporte: Int
    ): UltimaDeteccionResponse
}
