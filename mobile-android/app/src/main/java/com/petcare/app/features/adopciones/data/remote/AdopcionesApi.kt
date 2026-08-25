package com.petcare.app.features.adopciones.data.remote

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

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

    @GET("adopciones")
    suspend fun listar(): List<PublicacionAdopcionResponse>

    @GET("adopciones/mias")
    suspend fun listarMias(): List<PublicacionAdopcionResponse>

    @GET("adopciones/{id}")
    suspend fun obtenerDetalle(
        @Path("id") idPublicacion: Int
    ): PublicacionAdopcionResponse
}
