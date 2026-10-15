package com.petcare.app.features.ble.domain

/**
 * Identificadores de la flota de tags PetCare (US-30).
 *
 * Son funciones puras, sin dependencias de Android: se testean sin dispositivo.
 *
 * Ver docs/spike-escaneo-ble-segundo-plano.md, seccion "Identificadores de la flota".
 */

/**
 * Namespace Eddystone-UID comun a todos los tags de PetCare (10 bytes).
 *
 * Es el ASCII de "PETCAREUTN". Viaja en claro y cualquiera con un scanner lo lee,
 * asi que no hay nada que ganar haciendolo opaco: legible permite reconocer un tag
 * de PetCare de un vistazo en un log.
 *
 * Va en la mascara del ScanFilter, de modo que el chip Bluetooth descarta cualquier
 * Eddystone ajeno sin despertar el CPU.
 */
const val NAMESPACE_PETCARE = "5045544341524555544E"

/** Largo del namespace Eddystone-UID en bytes. */
const val LARGO_NAMESPACE_BYTES = 10

/** Largo del instance ID de Eddystone-UID en bytes, que es el largo del tagId. */
const val LARGO_INSTANCE_BYTES = 6

private val HEX_MAYUSCULA = Regex("^[0-9A-F]+$")

/**
 * Normaliza un tagId al formato del contrato de deteccion: 12 caracteres hex en
 * mayuscula, sin separadores.
 *
 * Acepta minusculas y separadores comunes (`:`, `-`, espacios) porque son la forma en
 * que la app del fabricante y los scanners muestran el valor, y es previsible que
 * alguien lo copie y pegue asi.
 *
 * Devuelve `null` si el valor no es un instance ID valido. Vale la pena validarlo en
 * el borde: un tagId mal formado no matchea contra ninguna mascota y la deteccion se
 * pierde en silencio.
 *
 * Es el mismo formato que US-32 tiene que guardar al asociar un tag a una mascota.
 */
fun normalizarTagId(valor: String): String? {
    val limpio = valor.trim()
        .replace(":", "")
        .replace("-", "")
        .replace(" ", "")
        .uppercase()

    if (limpio.length != LARGO_INSTANCE_BYTES * 2) return null
    if (!HEX_MAYUSCULA.matches(limpio)) return null
    return limpio
}

/** `true` si el frame pertenece a la flota PetCare y no a otro Eddystone cualquiera. */
fun BeaconFrame.EddystoneUid.esDeLaFlotaPetCare(): Boolean =
    namespace.equals(NAMESPACE_PETCARE, ignoreCase = true)

/**
 * Convierte una cadena hexadecimal en bytes.
 *
 * Devuelve `null` si la cadena no es hexadecimal valida o tiene largo impar.
 */
fun hexABytes(hex: String): ByteArray? {
    if (hex.length % 2 != 0) return null
    val normalizado = hex.uppercase()
    if (!HEX_MAYUSCULA.matches(normalizado)) return null

    return ByteArray(normalizado.length / 2) { i ->
        normalizado.substring(i * 2, i * 2 + 2).toInt(16).toByte()
    }
}
