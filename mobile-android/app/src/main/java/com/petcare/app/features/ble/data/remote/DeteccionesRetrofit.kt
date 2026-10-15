package com.petcare.app.features.ble.data.remote

import com.petcare.app.features.auth.data.remote.RetrofitClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

/**
 * Instancia de Retrofit **sin** `AuthTokenInterceptor`, para el endpoint anonimo de
 * detecciones (US-30 / US-31).
 *
 * ⚠️ **Esto es un desvio deliberado del patron del repo. No lo "arregles".**
 *
 * Todo el resto de la app usa `RetrofitClient`, que agrega el header `Authorization`
 * con el token de sesion. Aca eso seria exactamente lo que la historia prohibe: el
 * criterio de aceptacion pide que no se registre ningun dato que identifique al usuario
 * que detecta, y un token lo identifica de forma directa.
 *
 * Por eso esta clase construye su propio `Retrofit` sin interceptores, reusando
 * unicamente la `BASE_URL`.
 *
 * Ver docs/spike-escaneo-ble-segundo-plano.md, punto 5.
 */
object DeteccionesRetrofit {

    val api: DeteccionesApi by lazy {
        Retrofit.Builder()
            .baseUrl(RetrofitClient.BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(DeteccionesApi::class.java)
    }
}
