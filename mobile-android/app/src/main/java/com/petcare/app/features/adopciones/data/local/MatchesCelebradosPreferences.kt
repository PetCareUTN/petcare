package com.petcare.app.features.adopciones.data.local

import android.content.Context
import android.content.SharedPreferences

/**
 * Recuerda que solicitudes aceptadas ya se le festejaron al adoptante, asi la
 * pantalla de match aparece una sola vez por solicitud y no cada vez que abre
 * "Mis solicitudes".
 */
class MatchesCelebradosPreferences(context: Context) {

    private val sharedPreferences: SharedPreferences =
        context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

    fun fueCelebrado(idSolicitud: Int): Boolean =
        idSolicitud.toString() in celebrados()

    fun marcarCelebrados(idsSolicitud: Collection<Int>) {
        if (idsSolicitud.isEmpty()) return
        sharedPreferences.edit()
            .putStringSet(KEY_CELEBRADOS, celebrados() + idsSolicitud.map { it.toString() })
            .apply()
    }

    // getStringSet devuelve una vista que no se debe modificar: siempre se copia.
    private fun celebrados(): Set<String> =
        sharedPreferences.getStringSet(KEY_CELEBRADOS, emptySet())?.toSet().orEmpty()

    private companion object {
        const val PREFERENCES_NAME = "petcare_adopciones"
        const val KEY_CELEBRADOS = "matches_celebrados"
    }
}
