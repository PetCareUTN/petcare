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

/** Mismo valor que RoleName.VETERINARIO del backend (claim "rol" del JWT). */
private const val ROL_VETERINARIO = "veterinario"

/**
 * Los veterinarios trabajan desde la web: la app mobile es para los dueños de
 * mascotas. El backend deja loguear a ambos por el mismo endpoint, asi que el
 * rechazo se hace aca mirando el claim "rol" del token antes de abrir sesion.
 */
fun esTokenDeVeterinario(token: String): Boolean =
    try {
        val payload = token.split(".").getOrNull(1)
        if (payload == null) {
            false
        } else {
            val decoded = Base64.decode(
                payload,
                Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP
            )
            JSONObject(String(decoded, Charsets.UTF_8)).optString("rol") == ROL_VETERINARIO
        }
    } catch (_: Exception) {
        false
    }
