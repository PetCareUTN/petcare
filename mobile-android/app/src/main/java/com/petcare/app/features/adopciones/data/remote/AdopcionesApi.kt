package com.petcare.app.features.adopciones.data.remote

import retrofit2.http.Body
import retrofit2.http.POST

data class PublicarAdopcionRequest(
    val idMascota: Int,
    val descripcion: String
)

data class MascotaAdopcionResponse(
    val idMascota: Int,
    val nombre: String,
    val especie: String,
    val raza: String?,
    val sexo: String,
    val fechaNacimiento: String?,
    val foto: String?
)

data class PublicacionAdopcionResponse(
    val idPublicacion: Int,
    val estado: String,
    val descripcion: String,
    val createdAt: String,
    val mascota: MascotaAdopcionResponse
)

interface AdopcionesApi {

    @POST("adopciones")
    suspend fun publicar(
        @Body request: PublicarAdopcionRequest
    ): PublicacionAdopcionResponse
}
