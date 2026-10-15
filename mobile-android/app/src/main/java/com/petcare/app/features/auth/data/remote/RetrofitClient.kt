package com.petcare.app.features.auth.data.remote

import com.petcare.app.BuildConfig
import com.petcare.app.features.adopciones.data.remote.AdopcionesApi
import com.petcare.app.features.adopciones.data.remote.DescartesApi
import com.petcare.app.features.adopciones.data.remote.FavoritosApi
import com.petcare.app.features.adopciones.data.remote.SolicitudesAdopcionApi
import com.petcare.app.features.auth.data.local.SessionStore
import com.petcare.app.features.ble.data.remote.TagsBleApi
import com.petcare.app.features.historiaclinica.data.remote.HistoriaClinicaApi
import com.petcare.app.features.notificaciones.data.remote.NotificacionesApi
import com.petcare.app.features.perdidas.data.remote.ReportesPerdidaApi
import com.petcare.app.features.pets.data.remote.PetsApi
import com.petcare.app.features.profile.data.remote.ProfileApi
import com.petcare.app.features.servicios.data.remote.ServiciosApi
import com.petcare.app.features.turnos.data.remote.TurnosApi
import com.petcare.app.features.turnos.data.remote.TurnosServiciosApi
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object RetrofitClient {

    /*
     * La URL sale de BuildConfig y cambia segun la variante: la de debug apunta
     * al backend local (10.0.2.2 es la computadora donde corre el emulador) y la
     * de release al backend desplegado. Se configura en app/build.gradle.kts y
     * se puede pisar con -PPETCARE_API_URL. Ver docs/deploy.md.
     */
    val BASE_URL: String = BuildConfig.API_BASE_URL

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

    fun solicitudesAdopcionApi(sessionStore: SessionStore): SolicitudesAdopcionApi =
        createRetrofit(sessionStore)
            .create(SolicitudesAdopcionApi::class.java)

    fun favoritosApi(sessionStore: SessionStore): FavoritosApi =
        createRetrofit(sessionStore)
            .create(FavoritosApi::class.java)

    fun descartesApi(sessionStore: SessionStore): DescartesApi =
        createRetrofit(sessionStore)
            .create(DescartesApi::class.java)

    fun serviciosApi(sessionStore: SessionStore): ServiciosApi =
        createRetrofit(sessionStore)
            .create(ServiciosApi::class.java)

    fun turnosApi(sessionStore: SessionStore): TurnosApi =
        createRetrofit(sessionStore)
            .create(TurnosApi::class.java)

    fun turnosServiciosApi(sessionStore: SessionStore): TurnosServiciosApi =
        createRetrofit(sessionStore)
            .create(TurnosServiciosApi::class.java)

    fun reportesPerdidaApi(sessionStore: SessionStore): ReportesPerdidaApi =
        createRetrofit(sessionStore)
            .create(ReportesPerdidaApi::class.java)

    fun notificacionesApi(sessionStore: SessionStore): NotificacionesApi =
        createRetrofit(sessionStore)
            .create(NotificacionesApi::class.java)

    fun tagsBleApi(sessionStore: SessionStore): TagsBleApi =
        createRetrofit(sessionStore)
            .create(TagsBleApi::class.java)

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
