package com.petcare.app.features.ble.data.remote

import retrofit2.http.Body
import retrofit2.http.POST

/**
 * Una deteccion anonima de un tag PetCare, tal como la consume US-31.
 *
 * **No viaja nada del detector**: ni userId, ni token, ni device id, ni installation
 * id. Es el punto central del diseño de la historia, asi que cualquier campo que se
 * agregue aca hay que mirarlo dos veces.
 *
 * Ver docs/spike-escaneo-ble-segundo-plano.md, punto 5.
 */
data class DeteccionRequest(

    /**
     * UUID v4 generado en el cliente, que se reusa si el envio se reintenta.
     *
     * Es lo que permite deduplicar sin identificar a nadie: el backend pone un indice
     * unico sobre esta columna. Un indice sobre `(tagId, detectadoEn)` no alcanzaria,
     * porque dos detectores distintos pueden ver el mismo tag en el mismo instante — y
     * esas dos detecciones son justamente las que sirven para triangular.
     */
    val deteccionId: String,

    /** Instance ID del frame Eddystone-UID: 12 caracteres hex en mayuscula. */
    val tagId: String,

    val rssi: Int,

    /** UTC ISO-8601, generado en el dispositivo: las detecciones se encolan sin red. */
    val detectadoEn: String,

    /** Redondeada a 3 decimales (~110 m). Ver [com.petcare.app.features.ble.domain.redondearCoordenada]. */
    val latitud: Double,

    /** Redondeada a 3 decimales (~110 m). */
    val longitud: Double,

    val precisionMetros: Int,
)

interface DeteccionesApi {

    /**
     * Endpoint **anonimo**: no lleva `Authorization`.
     *
     * Por eso se llama con la instancia de Retrofit de [DeteccionesRetrofit] y no con
     * la de `RetrofitClient`, que agrega el token.
     */
    @POST("detecciones")
    suspend fun registrarDeteccion(@Body deteccion: DeteccionRequest)
}
