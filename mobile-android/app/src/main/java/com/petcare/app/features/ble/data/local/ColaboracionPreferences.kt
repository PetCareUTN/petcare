package com.petcare.app.features.ble.data.local

import android.content.Context
import android.content.SharedPreferences
import com.petcare.app.features.ble.domain.GuardiaDeThrottle
import com.petcare.app.features.ble.domain.MotorEscaneoBle

/**
 * Preferencias de la colaboracion anonima con la busqueda de mascotas perdidas (US-30).
 *
 * Arranca **apagada**: la colaboracion necesita que el usuario recorra el flujo
 * escalonado de permisos (incluido `ACCESS_BACKGROUND_LOCATION`, que en API 30+ se
 * concede desde Ajustes), asi que no puede estar activa sin una decision explicita.
 * El criterio de aceptacion que pide poder desactivarla se cumple igual.
 */
class ColaboracionPreferences(context: Context) {

    private val sharedPreferences: SharedPreferences =
        context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

    fun estaActiva(): Boolean =
        sharedPreferences.getBoolean(KEY_ACTIVA, false)

    fun setActiva(activa: Boolean) {
        sharedPreferences.edit()
            .putBoolean(KEY_ACTIVA, activa)
            .apply()
    }

    /**
     * Intervalo entre ventanas de escaneo, que es el "intervalo configurable para
     * limitar el consumo de bateria" del criterio de aceptacion.
     *
     * Nunca devuelve menos que el piso del [GuardiaDeThrottle]: por debajo de eso
     * Android bloquea el escaneo en silencio.
     */
    fun getIntervaloMillis(): Long =
        sharedPreferences.getLong(KEY_INTERVALO_MILLIS, MotorEscaneoBle.INTERVALO_ESCANEO_MILLIS)
            .coerceAtLeast(GuardiaDeThrottle.INTERVALO_MINIMO_MILLIS)

    fun setIntervaloMillis(millis: Long) {
        sharedPreferences.edit()
            .putLong(
                KEY_INTERVALO_MILLIS,
                millis.coerceAtLeast(GuardiaDeThrottle.INTERVALO_MINIMO_MILLIS),
            )
            .apply()
    }

    private companion object {
        // Preferencias propias, separadas de petcare_settings: son de una feature que
        // el usuario puede no activar nunca.
        const val PREFERENCES_NAME = "petcare_ble"
        const val KEY_ACTIVA = "colaboracion_activa"
        const val KEY_INTERVALO_MILLIS = "intervalo_escaneo_millis"
    }
}
