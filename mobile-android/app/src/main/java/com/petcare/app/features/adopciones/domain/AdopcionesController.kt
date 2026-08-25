package com.petcare.app.features.adopciones.domain

import com.petcare.app.features.adopciones.data.remote.AdopcionesApi
import com.petcare.app.features.adopciones.data.remote.PublicacionAdopcionResponse
import com.petcare.app.features.adopciones.data.remote.PublicarAdopcionRequest

class AdopcionesController(
    private val adopcionesApi: AdopcionesApi
) {

    suspend fun publicar(
        idMascota: Int,
        descripcion: String
    ): PublicacionAdopcionResponse =
        adopcionesApi.publicar(
            PublicarAdopcionRequest(
                idMascota = idMascota,
                descripcion = descripcion
            )
        )

    suspend fun listar(): List<PublicacionAdopcionResponse> =
        adopcionesApi.listar()

    suspend fun listarMias(): List<PublicacionAdopcionResponse> =
        adopcionesApi.listarMias()

    suspend fun obtenerDetalle(idPublicacion: Int): PublicacionAdopcionResponse =
        adopcionesApi.obtenerDetalle(idPublicacion)
}
