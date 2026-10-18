package com.petcare.app.features.pets.data.remote

import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

/** Persona encontrada al compartir: solo el nombre parcial ("Marta G."). */
data class UsuarioEncontradoResponse(
    val idUsuario: Int,
    val nombreParcial: String
)

data class CrearSolicitudCompartirRequest(
    val idMascota: Int,
    val idUsuarioDestino: Int
)

data class SolicitudCompartirResponse(
    val idSolicitud: Int,
    val estado: String,
    val idMascota: Int,
    val nombreMascota: String,
    val especieMascota: String,
    val fotoMascota: String?,
    val idUsuarioOrigen: Int,
    val nombreOrigen: String,
    val idUsuarioDestino: Int,
    val nombreDestino: String
)

data class DuenoMascotaResponse(
    val idUsuario: Int,
    val nombre: String,
    val esPrincipal: Boolean
)

interface MascotasCompartidasApi {

    @GET("mascotas-compartidas/buscar-usuario")
    suspend fun buscarUsuario(
        @Query("email") email: String? = null,
        @Query("documento") documento: String? = null
    ): UsuarioEncontradoResponse

    @POST("mascotas-compartidas/solicitudes")
    suspend fun solicitar(
        @Body request: CrearSolicitudCompartirRequest
    ): SolicitudCompartirResponse

    @GET("mascotas-compartidas/solicitudes/recibidas")
    suspend fun listarRecibidas(): List<SolicitudCompartirResponse>

    @GET("mascotas-compartidas/solicitudes/enviadas")
    suspend fun listarEnviadas(
        @Query("idMascota") idMascota: Int
    ): List<SolicitudCompartirResponse>

    @POST("mascotas-compartidas/solicitudes/{id}/aceptar")
    suspend fun aceptar(@Path("id") idSolicitud: Int): SolicitudCompartirResponse

    @POST("mascotas-compartidas/solicitudes/{id}/rechazar")
    suspend fun rechazar(@Path("id") idSolicitud: Int): SolicitudCompartirResponse

    @DELETE("mascotas-compartidas/solicitudes/{id}")
    suspend fun cancelar(@Path("id") idSolicitud: Int): SolicitudCompartirResponse

    @GET("mascotas-compartidas/mascotas/{idMascota}/duenos")
    suspend fun listarDuenios(
        @Path("idMascota") idMascota: Int
    ): List<DuenoMascotaResponse>

    @POST("mascotas-compartidas/mascotas/{idMascota}/salir")
    suspend fun salir(@Path("idMascota") idMascota: Int)

    @DELETE("mascotas-compartidas/mascotas/{idMascota}/duenos/{idUsuario}")
    suspend fun quitarDuenio(
        @Path("idMascota") idMascota: Int,
        @Path("idUsuario") idUsuario: Int
    )
}
