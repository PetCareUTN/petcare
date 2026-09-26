package com.petcare.app.features.ble.data.local

import android.content.Context
import android.content.SharedPreferences

/**
 * Que tags tienen el monitoreo de separacion activo (US-34).
 *
 * Arranca vacia: igual que [ColaboracionPreferences], activar el seguimiento de una
 * mascota es una decision explicita del usuario, no algo que corra por defecto.
 *
 * Todavia no hay pantalla que escriba aca (llega con la UI de US-34/US-35); mientras
 * tanto el service no tiene nada que monitorear y no hace nada distinto de hoy.
 */
class MonitoreoSeparacionPreferences(context: Context) {

    private val sharedPreferences: SharedPreferences =
        context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

    fun tagsMonitoreados(): Set<String> =
        sharedPreferences.getStringSet(KEY_TAGS, emptySet()).orEmpty()

    fun activarSeguimiento(tagId: String) {
        sharedPreferences.edit()
            .putStringSet(KEY_TAGS, tagsMonitoreados() + tagId)
            .apply()
    }

    fun desactivarSeguimiento(tagId: String) {
        sharedPreferences.edit()
            .putStringSet(KEY_TAGS, tagsMonitoreados() - tagId)
            .apply()
    }

    private companion object {
        // Preferencias propias, separadas de petcare_ble (US-30): el usuario puede
        // activar una sin la otra.
        const val PREFERENCES_NAME = "petcare_ble_separacion"
        const val KEY_TAGS = "tags_monitoreados"
    }
}
