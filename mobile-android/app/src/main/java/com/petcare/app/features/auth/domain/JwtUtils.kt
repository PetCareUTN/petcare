package com.petcare.app.features.auth.domain

import android.util.Base64
import com.petcare.app.features.auth.data.local.SessionStore
import org.json.JSONObject

/**
 * El cliente no guarda el id numerico del usuario en ningun lado (solo
 * token y nombre). Como el JWT ya incluye "sub" (id_usuario) en su payload
 * y no hace falta la clave para leerlo (solo para validarlo), lo decodificamos
 * ahi cuando alguna pantalla necesita saber "soy yo" sin agregar un endpoint
 * ni tocar el modelo de sesion que ya esta en uso.
 */
fun currentUserId(sessionStore: SessionStore): Int? {
    val token = sessionStore.getSession()?.token ?: return null
    return try {
        val payload = token.split(".").getOrNull(1) ?: return null
        val decoded = Base64.decode(payload, Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP)
        JSONObject(String(decoded, Charsets.UTF_8)).optInt("sub", -1).takeIf { it > 0 }
    } catch (_: Exception) {
        null
    }
}
