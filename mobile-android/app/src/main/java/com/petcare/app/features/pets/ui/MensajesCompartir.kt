package com.petcare.app.features.pets.ui

import org.json.JSONObject
import retrofit2.HttpException
import java.io.IOException

/** Qué le pasó a una operación de compartir, ya traducido para mostrarlo. */
internal sealed interface ErrorCompartir {
    data object SesionExpirada : ErrorCompartir
    data class Mensaje(val texto: String) : ErrorCompartir
}

/**
 * El backend manda el motivo real en el body (por ejemplo "No se encontró
 * ningún usuario con ese dato"). Si no hay body se usa el texto de reserva.
 */
internal fun errorDeCompartir(exception: Throwable, fallback: String): ErrorCompartir =
    when (exception) {
        is HttpException -> if (exception.code() == 401) {
            ErrorCompartir.SesionExpirada
        } else {
            ErrorCompartir.Mensaje(
                runCatching {
                    val json = JSONObject(exception.response()?.errorBody()?.string() ?: "{}")
                    json.optString("mensaje").ifBlank { json.optString("message") }
                        .ifBlank { fallback }
                }.getOrDefault(fallback)
            )
        }
        is IOException -> ErrorCompartir.Mensaje("No se pudo conectar con el servidor")
        else -> ErrorCompartir.Mensaje(fallback)
    }
