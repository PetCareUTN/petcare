package com.petcare.app.features.servicios.domain

import com.petcare.app.features.servicios.data.remote.CreateServicioRequest
import com.petcare.app.features.servicios.data.remote.ServicioResponse
import com.petcare.app.features.servicios.data.remote.ServiciosApi
import com.petcare.app.features.servicios.data.remote.UpdateServicioRequest

class ServiciosController(
    private val serviciosApi: ServiciosApi
) {

    suspend fun getMyServicios(): List<ServicioResponse> = serviciosApi.getMyServicios()

    suspend fun getServicios(categoria: String?): List<ServicioResponse> =
        serviciosApi.getServicios(categoria)

    suspend fun createServicio(request: CreateServicioRequest): ServicioResponse =
        serviciosApi.createServicio(request)

    suspend fun updateServicio(id: Int, request: UpdateServicioRequest): ServicioResponse =
        serviciosApi.updateServicio(id, request)

    suspend fun deleteServicio(id: Int) = serviciosApi.deleteServicio(id)
}
