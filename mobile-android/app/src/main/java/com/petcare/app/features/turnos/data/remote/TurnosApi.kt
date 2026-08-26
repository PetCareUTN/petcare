package com.petcare.app.features.turnos.data.remote

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

data class VeterinariaResponse(
    val idVeterinario: Int,
    val nombre: String,
    val direccion: String?
)

data class DisponibilidadTurnoResponse(
    val idDisponibilidad: Int,
    val idVeterinario: Int,
    val diaSemana: String,
    val horaInicio: String,
    val horaFin: String
)

data class CreateTurnoRequest(
    val idMascota: Int,
    val idVeterinario: Int,
    val fecha: String,
    val hora: String,
    val motivoConsulta: String?
)

data class TurnoResponse(
    val idTurno: Int,
    val idVeterinario: Int,
    val idMascota: Int,
    val nombreMascota: String,
    val fecha: String,
    val hora: String,
    val motivoConsulta: String?,
    val estado: String,
    val motivoRechazo: String?,
    val canceladoPor: String?,
    val motivoCancelacion: String?
)

/** Turno visto por el dueño: la contraparte es la veterinaria. */
data class MiTurnoResponse(
    val idTurno: Int,
    val idMascota: Int,
    val nombreMascota: String,
    val idVeterinario: Int,
    val nombreVeterinaria: String,
    val direccionVeterinaria: String?,
    val fecha: String,
    val hora: String,
    val motivoConsulta: String?,
    val estado: String,
    val motivoRechazo: String?,
    val canceladoPor: String?,
    val motivoCancelacion: String?
)

data class CancelarTurnoVeterinarioRequest(
    val motivoCancelacion: String?
)

interface TurnosApi {

    @GET("turnos-veterinarios/mios")
    suspend fun getMisTurnos(): List<MiTurnoResponse>

    @GET("veterinarios/aprobados")
    suspend fun getVeterinariasAprobadas(): List<VeterinariaResponse>

    @GET("disponibilidades-veterinarias/veterinarios/{idVeterinario}")
    suspend fun getDisponibilidades(
        @Path("idVeterinario") idVeterinario: Int
    ): List<DisponibilidadTurnoResponse>

    @GET("turnos-veterinarios/horarios-disponibles")
    suspend fun getHorariosDisponibles(
        @Query("idVeterinario") idVeterinario: Int,
        @Query("fecha") fecha: String
    ): List<String>

    @POST("turnos-veterinarios")
    suspend fun solicitarTurno(
        @Body request: CreateTurnoRequest
    ): TurnoResponse

    @PATCH("turnos-veterinarios/{idTurno}/cancelar")
    suspend fun cancelar(
        @Path("idTurno") idTurno: Int,
        @Body request: CancelarTurnoVeterinarioRequest
    ): TurnoResponse
}
