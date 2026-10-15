package com.petcare.app.features.adopciones.domain

import com.petcare.app.features.adopciones.data.remote.AgregarFavoritoRequest
import com.petcare.app.features.adopciones.data.remote.FavoritoResponse
import com.petcare.app.features.adopciones.data.remote.FavoritosApi

class FavoritosController(
    private val favoritosApi: FavoritosApi
) {

    suspend fun agregar(idPublicacion: Int): FavoritoResponse =
        favoritosApi.agregar(AgregarFavoritoRequest(idPublicacion))

    suspend fun quitar(idPublicacion: Int) {
        favoritosApi.quitar(idPublicacion)
    }

    suspend fun listar(): List<FavoritoResponse> =
        favoritosApi.listar()
}
