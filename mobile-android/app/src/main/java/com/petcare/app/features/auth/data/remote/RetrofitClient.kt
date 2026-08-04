package com.petcare.app.features.auth.data.remote

import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object RetrofitClient {

    /*
     * Desde el emulador Android, 10.0.2.2 representa
     * la computadora donde se está ejecutando el emulador.
     */
     private const val BASE_URL = "http://10.0.2.2:3000/"

    val authApi: AuthApi by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(AuthApi::class.java)
    }
}