package com.petcare.app.features.auth.data.remote

import com.petcare.app.features.auth.data.local.SessionStore
import com.petcare.app.features.pets.data.remote.PetsApi
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object RetrofitClient {

    /*
     * Desde el emulador Android, 10.0.2.2 representa
     * la computadora donde se está ejecutando el emulador.
     */
    private const val BASE_URL = "http://10.0.2.2:3000/"

    fun authApi(sessionStore: SessionStore): AuthApi =
        createRetrofit(sessionStore)
            .create(AuthApi::class.java)

    fun petsApi(sessionStore: SessionStore): PetsApi =
        createRetrofit(sessionStore)
            .create(PetsApi::class.java)

    private fun createRetrofit(sessionStore: SessionStore): Retrofit {
        val okHttpClient = OkHttpClient.Builder()
            .addInterceptor(
                AuthTokenInterceptor(
                    AuthorizationHeaderProvider(sessionStore)
                )
            )
            .build()

        return Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }
}
