package com.petcare.app.features.turnos.data.remote

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

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
    val horaInicio: String,
    val horaFin: String
)

data class TurnoResponse(
    val idTurno: Int,
    val idMascota: Int,
    val nombreMascota: String,
    val idVeterinario: Int,
    val fecha: String,
    val horaInicio: String,
    val horaFin: String,
    val estado: String,
    val createdAt: String
)

interface TurnosApi {

    @GET("veterinarios/aprobados")
    suspend fun getVeterinariasAprobadas(): List<VeterinariaResponse>

    @GET("disponibilidades-veterinarias/veterinarios/{idVeterinario}")
    suspend fun getDisponibilidades(
        @Path("idVeterinario") idVeterinario: Int
    ): List<DisponibilidadTurnoResponse>

    @POST("turnos")
    suspend fun solicitarTurno(
        @Body request: CreateTurnoRequest
    ): TurnoResponse
}
