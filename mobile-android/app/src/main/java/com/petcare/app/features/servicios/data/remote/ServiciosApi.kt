package com.petcare.app.features.servicios.data.remote

import com.google.gson.annotations.SerializedName
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query
import retrofit2.http.Multipart
import retrofit2.http.Part
import retrofit2.http.PartMap
import okhttp3.MultipartBody
import okhttp3.RequestBody

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

    val idUsuario: Int,
    val nombrePrestador: String,
    val categoria: String,
    val descripcion: String?,
    // Ubicación del prestador (dirección de la cuenta si es veterinario, o de
    // la solicitud de prestador aprobada si es dueño de mascota). Puede venir
    // en null si todavía no se pudo geocodificar.
    val direccion: String?,
    val latitud: Double?,
    val longitud: Double?,
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
    @GET("prestadores/solicitudes/mias")
    suspend fun solicitudesPrestador(): List<SolicitudPrestador>

    @Multipart
    @POST("prestadores/solicitudes")
    suspend fun solicitarPrestador(@PartMap datos: Map<String, @JvmSuppressWildcards RequestBody>, @Part archivos: List<MultipartBody.Part>)

    @GET("prestadores/reservas")
    suspend fun reservasPrestador(): List<ReservaPrestador>

    @POST("prestadores/turnos/{id}/completar")
    suspend fun completarServicio(@Path("id") id: Int)

    @POST("prestadores/turnos/{id}/resena")
    suspend fun resenarServicio(@Path("id") id: Int, @Body datos: ResenaPrestador)

    @POST("prestadores/turnos/{id}/reporte")
    suspend fun reportarServicio(@Path("id") id: Int, @Body datos: Map<String, String>)

    @GET("prestadores/{id}/{categoria}/perfil")
    suspend fun perfilPrestador(@Path("id") id: Int, @Path("categoria") categoria: String): PerfilPrestador

    @GET("servicios/mios")
    suspend fun getMyServicios(): List<ServicioResponse>

    @GET("servicios")
    suspend fun getServicios(
        @Query("categoria") categoria: String?
    ): List<ServicioResponse>

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
