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
}
