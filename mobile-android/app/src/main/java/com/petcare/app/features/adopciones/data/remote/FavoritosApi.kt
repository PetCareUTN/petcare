package com.petcare.app.features.adopciones.data.remote

import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

data class AgregarFavoritoRequest(
    val idPublicacion: Int
)

data class MensajeResponse(
    val mensaje: String
)

data class FavoritoResponse(
    val idFavorito: Int,
    val createdAt: String,
    val publicacion: PublicacionAdopcionResponse
)

interface FavoritosApi {

    @POST("favoritos")
    suspend fun agregar(
        @Body request: AgregarFavoritoRequest
    ): FavoritoResponse

    @DELETE("favoritos/{idPublicacion}")
    suspend fun quitar(
        @Path("idPublicacion") idPublicacion: Int
    ): MensajeResponse

    @GET("favoritos")
    suspend fun listar(): List<FavoritoResponse>
}
