package com.petcare.app.features.adopciones.data.remote

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

data class PublicarAdopcionRequest(
    val idMascota: Int,
    val descripcion: String,
    val tamano: String? = null,
    val vacunado: Boolean? = null,
    val compatiblePerros: Boolean? = null,
    val compatibleGatos: Boolean? = null,
    val compatibleNinos: Boolean? = null,
    val necesitaPatio: Boolean? = null,
    val ubicacion: String? = null
)

data class MascotaAdopcionResponse(
    val idMascota: Int,
    val nombre: String,
    val especie: String,
    val raza: String?,
    val sexo: String,
    val fechaNacimiento: String?,
    val edadAnios: Int?,
    val esterilizado: Boolean,
    val foto: String?
)

data class PublicacionAdopcionResponse(
    val idPublicacion: Int,
    val estado: String,
    val descripcion: String,
    val tamano: String?,
    val vacunado: Boolean,
    val compatiblePerros: Boolean,
    val compatibleGatos: Boolean,
    val compatibleNinos: Boolean,
    val necesitaPatio: Boolean,
    val ubicacion: String?,
    val createdAt: String,
    val mascota: MascotaAdopcionResponse
)

interface AdopcionesApi {

    @POST("adopciones")
    suspend fun publicar(
        @Body request: PublicarAdopcionRequest
    ): PublicacionAdopcionResponse

    @GET("adopciones")
    suspend fun listar(
        @Query("especie") especie: String? = null,
        @Query("tamano") tamano: String? = null,
        @Query("sexo") sexo: String? = null,
        @Query("esterilizado") esterilizado: Boolean? = null,
        @Query("vacunado") vacunado: Boolean? = null,
        @Query("compatiblePerros") compatiblePerros: Boolean? = null,
        @Query("compatibleGatos") compatibleGatos: Boolean? = null,
        @Query("compatibleNinos") compatibleNinos: Boolean? = null,
        @Query("necesitaPatio") necesitaPatio: Boolean? = null
    ): List<PublicacionAdopcionResponse>

    @GET("adopciones/mias")
    suspend fun listarMias(): List<PublicacionAdopcionResponse>

    @GET("adopciones/{id}")
    suspend fun obtenerDetalle(
        @Path("id") idPublicacion: Int
    ): PublicacionAdopcionResponse

    @PATCH("adopciones/{id}/cancelar")
    suspend fun cancelar(
        @Path("id") idPublicacion: Int
    ): PublicacionAdopcionResponse

    @PATCH("adopciones/{id}/pausar")
    suspend fun pausar(
        @Path("id") idPublicacion: Int
    ): PublicacionAdopcionResponse

    @PATCH("adopciones/{id}/reanudar")
    suspend fun reanudar(
        @Path("id") idPublicacion: Int
    ): PublicacionAdopcionResponse
}

/** Filtros de búsqueda para el descubrimiento de mascotas en adopción. */
data class FiltrosAdopcion(
    val especie: String? = null,
    val tamano: String? = null,
    val sexo: String? = null,
    val esterilizado: Boolean? = null,
    val vacunado: Boolean? = null,
    val compatiblePerros: Boolean? = null,
    val compatibleGatos: Boolean? = null,
    val compatibleNinos: Boolean? = null,
    val necesitaPatio: Boolean? = null
) {
    val estaVacio: Boolean
        get() = especie == null && tamano == null && sexo == null &&
            esterilizado == null && vacunado == null && compatiblePerros == null &&
            compatibleGatos == null && compatibleNinos == null && necesitaPatio == null
}
