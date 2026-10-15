package com.petcare.app.features.turnos.data.remote

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

data class CreateTurnoServicioRequest(
    val idMascota: Int,
    val idServicio: Int,
    val fecha: String,
    val horaInicio: String,
    val notas: String?
)

data class CancelarTurnoServicioRequest(
    val motivoCancelacion: String?
)

/** Turno de servicio visto por el dueño: la contraparte es el prestador. */
data class MiReservaServicioResponse(
    val idTurno: Int,
    val idMascota: Int,
    val nombreMascota: String,
    val idServicio: Int,
    val categoria: String,
    val idPrestador: Int,
    val nombrePrestador: String,
    val telefonoPrestador: String?,
    val fecha: String,
    val horaInicio: String,
    val horaFin: String,
    val notas: String?,
    val estado: String,
    val motivoCancelacion: String?,
    val canceladoPor: String?
)

/** Turno de servicio visto por el prestador: la contraparte es el dueño. */
data class ReservaServicioRecibidaResponse(
    val idTurno: Int,
    val idServicio: Int,
    val categoria: String,
    val idMascota: Int,
    val nombreMascota: String,
    val idDuenio: Int,
    val nombreDuenio: String,
    val emailDuenio: String,
    val telefonoDuenio: String?,
    val fecha: String,
    val horaInicio: String,
    val horaFin: String,
    val notas: String?,
    val estado: String,
    val motivoCancelacion: String?,
    val canceladoPor: String?
)

interface TurnosServiciosApi {

    @GET("turnos-servicios/mios")
    suspend fun getMisReservas(): List<MiReservaServicioResponse>

    @GET("turnos-servicios/mias")
    suspend fun getRecibidas(): List<ReservaServicioRecibidaResponse>

    @GET("turnos-servicios/horarios-disponibles")
    suspend fun getHorariosDisponibles(
        @Query("idServicio") idServicio: Int,
        @Query("fecha") fecha: String
    ): List<String>

    @POST("turnos-servicios")
    suspend fun solicitar(
        @Body request: CreateTurnoServicioRequest
    ): ReservaServicioRecibidaResponse

    @PATCH("turnos-servicios/{idTurno}/cancelar")
    suspend fun cancelar(
        @Path("idTurno") idTurno: Int,
        @Body request: CancelarTurnoServicioRequest
    )
}
