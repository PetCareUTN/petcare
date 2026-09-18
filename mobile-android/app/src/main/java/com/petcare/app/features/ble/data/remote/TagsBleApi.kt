package com.petcare.app.features.ble.data.remote

import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

/** Tag BLE vinculado al perfil de una mascota (US-32). */
data class TagBleResponse(
    val idTagBle: Int,
    val tagId: String,
    val idMascota: Int,
    val createdAt: String
)

data class VincularTagBleRequest(
    val tagId: String
)

data class MensajeResponse(
    val mensaje: String
)

/**
 * Envuelve el tag para que el body nunca esté vacío cuando no hay uno
 * vinculado: un `200` con body vacío hace que Gson tire EOFException al
 * intentar parsearlo (a diferencia de `204`, que Retrofit sí sabe tratar
 * como "sin contenido" sin pasar por el conversor).
 */
data class ObtenerTagBleResponse(
    val tagBle: TagBleResponse?
)

interface TagsBleApi {

    @GET("mascotas/{idMascota}/tag-ble")
    suspend fun obtener(
        @Path("idMascota") idMascota: Int
    ): ObtenerTagBleResponse

    @POST("mascotas/{idMascota}/tag-ble")
    suspend fun vincular(
        @Path("idMascota") idMascota: Int,
        @Body request: VincularTagBleRequest
    ): TagBleResponse

    @DELETE("mascotas/{idMascota}/tag-ble")
    suspend fun desvincular(
        @Path("idMascota") idMascota: Int
    ): MensajeResponse
}
