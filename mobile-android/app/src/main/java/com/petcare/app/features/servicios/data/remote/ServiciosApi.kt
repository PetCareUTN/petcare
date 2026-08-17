package com.petcare.app.features.servicios.data.remote

import com.google.gson.annotations.SerializedName
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path

data class DisponibilidadResponse(
    @SerializedName("idDisponibilidad")
    val id: Int,

    val diaSemana: String,
    val horaInicio: String,
    val horaFin: String
)

data class ServicioResponse(
    @SerializedName("idServicio")
    val id: Int,

    val categoria: String,
    val descripcion: String?,
    val disponibilidades: List<DisponibilidadResponse>
)

data class DisponibilidadRequest(
    val diaSemana: String,
    val horaInicio: String,
    val horaFin: String
)

data class CreateServicioRequest(
    val categoria: String,
    val descripcion: String?,
    val disponibilidades: List<DisponibilidadRequest>
)

data class UpdateServicioRequest(
    val categoria: String,
    val descripcion: String?,
    val disponibilidades: List<DisponibilidadRequest>
)

interface ServiciosApi {

    @GET("servicios/mios")
    suspend fun getMyServicios(): List<ServicioResponse>

    @POST("servicios")
    suspend fun createServicio(
        @Body request: CreateServicioRequest
    ): ServicioResponse

    @PATCH("servicios/{id}")
    suspend fun updateServicio(
        @Path("id") id: Int,
        @Body request: UpdateServicioRequest
    ): ServicioResponse

    @DELETE("servicios/{id}")
    suspend fun deleteServicio(
        @Path("id") id: Int
    )
}
