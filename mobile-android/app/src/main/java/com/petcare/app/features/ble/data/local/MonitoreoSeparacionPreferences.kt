package com.petcare.app.features.ble.data.local

import android.content.Context
import android.content.SharedPreferences
import com.petcare.app.features.ble.domain.SensibilidadSeparacion

/**
 * Que tags tienen el monitoreo de separacion activo (US-34), y como avisa cada uno
 * (US-35).
 *
 * Arranca vacia: igual que [ColaboracionPreferences], activar el seguimiento de una
 * mascota es una decision explicita del usuario, no algo que corra por defecto.
 *
 * La configuracion de cada tag (sensibilidad, silenciado, nombre de la mascota) se
 * guarda por separado del set de tags monitoreados y **no se borra al desactivar**: si
 * el dueño apaga el monitoreo y lo vuelve a prender, recupera lo que ya habia elegido.
 */
class MonitoreoSeparacionPreferences(context: Context) {

    private val sharedPreferences: SharedPreferences =
        context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

    fun tagsMonitoreados(): Set<String> =
        sharedPreferences.getStringSet(KEY_TAGS, emptySet()).orEmpty()

    /**
     * Activa el monitoreo de [tagId].
     *
     * [nombreMascota] es lo que muestra la alerta: el service corre sin sesion ni red
     * garantizadas, asi que no puede ir a buscarlo al backend en el momento del aviso.
     */
    fun activarSeguimiento(tagId: String, nombreMascota: String? = null) {
        sharedPreferences.edit()
            .putStringSet(KEY_TAGS, tagsMonitoreados() + tagId)
            .apply()
        nombreMascota?.let { setNombreMascota(tagId, it) }
    }

    fun desactivarSeguimiento(tagId: String) {
        sharedPreferences.edit()
            .putStringSet(KEY_TAGS, tagsMonitoreados() - tagId)
            .apply()
    }

    fun nombreMascota(tagId: String): String? =
        sharedPreferences.getString(keyNombre(tagId), null)

    /**
     * Se refresca cada vez que se abre el perfil, asi un cambio de nombre llega a la
     * alerta sin tener que apagar y prender el monitoreo.
     */
    fun setNombreMascota(tagId: String, nombre: String) {
        sharedPreferences.edit()
            .putString(keyNombre(tagId), nombre)
            .apply()
    }

    fun sensibilidad(tagId: String): SensibilidadSeparacion =
        SensibilidadSeparacion.desdeNombre(sharedPreferences.getString(keySensibilidad(tagId), null))

    fun setSensibilidad(tagId: String, sensibilidad: SensibilidadSeparacion) {
        sharedPreferences.edit()
            .putString(keySensibilidad(tagId), sensibilidad.name)
            .apply()
    }

    /**
     * Si la alerta en el celular esta silenciada para esta mascota.
     *
     * Silenciar no es lo mismo que desactivar: la deteccion sigue corriendo y el aviso
     * sigue quedando en la campanita, solo que sin la notificacion que suena en el
     * momento. Sirve para cuando el dueño sabe que la mascota va a estar lejos un rato
     * (en la guarderia, paseando con otra persona) y no quiere perder el historial.
     */
    fun estaSilenciada(tagId: String): Boolean =
        sharedPreferences.getBoolean(keySilenciada(tagId), false)

    fun setSilenciada(tagId: String, silenciada: Boolean) {
        sharedPreferences.edit()
            .putBoolean(keySilenciada(tagId), silenciada)
            .apply()
    }

    private fun keyNombre(tagId: String) = "nombre_$tagId"
    private fun keySensibilidad(tagId: String) = "sensibilidad_$tagId"
    private fun keySilenciada(tagId: String) = "silenciada_$tagId"

    private companion object {
        // Preferencias propias, separadas de petcare_ble (US-30): el usuario puede
        // activar una sin la otra.
        const val PREFERENCES_NAME = "petcare_ble_separacion"
        const val KEY_TAGS = "tags_monitoreados"
    }
}
