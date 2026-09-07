package com.petcare.app.features.adopciones.data.remote

import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.POST

data class DescartarPublicacionRequest(
    val idPublicacion: Int
)

interface DescartesApi {

    @POST("descartes")
    suspend fun descartar(
        @Body request: DescartarPublicacionRequest
    ): MensajeResponse

    @DELETE("descartes")
    suspend fun limpiar(): MensajeResponse
}
