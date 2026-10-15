package com.petcare.app.features.settings.data.local

import android.content.Context
import android.content.SharedPreferences

/**
 * Guarda la preferencia de tema elegida por el usuario.
 *
 * Devuelve `null` mientras el usuario no haya elegido nada, para que la app
 * siga el tema del sistema hasta que decida lo contrario.
 */
class ThemePreferences(context: Context) {

    private val sharedPreferences: SharedPreferences =
        context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

    fun getDarkMode(): Boolean? =
        if (sharedPreferences.contains(KEY_DARK_MODE)) {
            sharedPreferences.getBoolean(KEY_DARK_MODE, false)
        } else {
            null
        }

    fun setDarkMode(enabled: Boolean) {
        sharedPreferences.edit()
            .putBoolean(KEY_DARK_MODE, enabled)
            .apply()
    }

    private companion object {
        const val PREFERENCES_NAME = "petcare_settings"
        const val KEY_DARK_MODE = "dark_mode_enabled"
    }
}
