package com.petcare.app.features.auth.data.remote

import com.petcare.app.features.adopciones.data.remote.AdopcionesApi
import com.petcare.app.features.auth.data.local.SessionStore
import com.petcare.app.features.historiaclinica.data.remote.HistoriaClinicaApi
import com.petcare.app.features.pets.data.remote.PetsApi
import com.petcare.app.features.profile.data.remote.ProfileApi
import com.petcare.app.features.servicios.data.remote.ServiciosApi
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object RetrofitClient {

    /*
     * Desde el emulador Android, 10.0.2.2 representa
     * la computadora donde se está ejecutando el emulador.
     */
     const val BASE_URL = "http://10.0.2.2:3000/"

    fun authApi(sessionStore: SessionStore): AuthApi =
        createRetrofit(sessionStore)
            .create(AuthApi::class.java)

    fun petsApi(sessionStore: SessionStore): PetsApi =
        createRetrofit(sessionStore)
            .create(PetsApi::class.java)

    fun historiaClinicaApi(sessionStore: SessionStore): HistoriaClinicaApi =
        createRetrofit(sessionStore)
            .create(HistoriaClinicaApi::class.java)

    fun profileApi(sessionStore: SessionStore): ProfileApi =
        createRetrofit(sessionStore)
            .create(ProfileApi::class.java)

    fun adopcionesApi(sessionStore: SessionStore): AdopcionesApi =
        createRetrofit(sessionStore)
            .create(AdopcionesApi::class.java)

    fun serviciosApi(sessionStore: SessionStore): ServiciosApi =
        createRetrofit(sessionStore)
            .create(ServiciosApi::class.java)

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
