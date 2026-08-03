package com.petcare.app.features.historiaclinica.data.remote

import retrofit2.http.GET
import retrofit2.http.Path

data class EventoClinicoResponse(
    val idEvento: Int,
    val idHistoria: Int,
    val idMascota: Int,
    val idVeterinario: Int,
    val tipo: String,
    val fecha: String,
    val descripcion: String,
    val diagnostico: String?,
    val tratamiento: String?,
    val observaciones: String?,
    val createdAt: String,
    val updatedAt: String
)

data class HistoriaClinicaResponse(
    val idHistoria: Int?,
    val idMascota: Int,
    val fechaCreacion: String?,
    val eventos: List<EventoClinicoResponse>
)

interface HistoriaClinicaApi {

    @GET("eventos-clinicos/mascota/{idMascota}")
    suspend fun getHistoriaClinica(
        @Path("idMascota") idMascota: Int
    ): HistoriaClinicaResponse
}
