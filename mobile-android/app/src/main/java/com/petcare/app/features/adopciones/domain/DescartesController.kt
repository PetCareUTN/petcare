package com.petcare.app.features.adopciones.domain

import com.petcare.app.features.adopciones.data.remote.DescartarPublicacionRequest
import com.petcare.app.features.adopciones.data.remote.DescartesApi

class DescartesController(
    private val descartesApi: DescartesApi
) {

    suspend fun descartar(idPublicacion: Int) {
        descartesApi.descartar(DescartarPublicacionRequest(idPublicacion))
    }

    suspend fun limpiar() {
        descartesApi.limpiar()
    }
}
