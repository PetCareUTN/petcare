package com.petcare.app.features.ble.domain

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import kotlin.math.round

/**
 * Lo que hace que una deteccion sea anonima (US-30).
 *
 * Son funciones puras, sin dependencias de Android: se testean sin dispositivo.
 *
 * Ver docs/spike-escaneo-ble-segundo-plano.md, punto 5.
 */

/** Decimales a los que se redondean las coordenadas antes de enviarlas. */
const val DECIMALES_COORDENADA = 3

/**
 * Redondea una coordenada a 3 decimales (~110 m).
 *
 * La historia pide "ubicacion aproximada", y el redondeo evita que las detecciones
 * terminen dibujando el domicilio del detector. El `rssi` ya aporta la nocion de
 * cercania, asi que no se pierde nada util.
 */
fun redondearCoordenada(valor: Double): Double {
    val factor = Math.pow(10.0, DECIMALES_COORDENADA.toDouble())
    return round(valor * factor) / factor
}

/**
 * Formatea un instante como UTC ISO-8601, que es lo que espera el backend.
 *
 * El timestamp se toma en el dispositivo y no en el servidor porque las detecciones se
 * encolan cuando no hay red: la hora de llegada al backend no dice nada sobre cuando se
 * vio al tag.
 *
 * Se usa `SimpleDateFormat` y no `java.time` porque el proyecto tiene `minSdk 24` sin
 * desugaring.
 */
fun formatearInstanteUtc(millis: Long): String =
    SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        .apply { timeZone = TimeZone.getTimeZone("UTC") }
        .format(Date(millis))

/**
 * Evita mandar la misma deteccion muchas veces seguidas.
 *
 * Dentro de una sola ventana de escaneo el tag se ve varias veces (emite cada ~1 s),
 * y mandar todas esas lecturas no aporta nada: son el mismo tag, en el mismo lugar, en
 * el mismo momento. Con una por ventana alcanza para la triangulacion y se ahorra
 * bateria, datos y trabajo del backend.
 *
 * Es pura (recibe el reloj por parametro), asi que se testea sin dispositivo.
 */
class AntiRepeticion(
    private val ventanaMillis: Long = VENTANA_POR_DEFECTO_MILLIS,
) {

    private val ultimoEnvioPorTag = mutableMapOf<String, Long>()

    /** `true` si esta lectura del tag hay que enviarla. */
    fun deberiaEnviar(tagId: String, ahoraMillis: Long): Boolean {
        val ultimo = ultimoEnvioPorTag[tagId]
        if (ultimo != null && ahoraMillis - ultimo < ventanaMillis) return false

        ultimoEnvioPorTag[tagId] = ahoraMillis
        return true
    }

    fun olvidar() = ultimoEnvioPorTag.clear()

    companion object {
        /**
         * Por defecto, una deteccion por tag por ciclo de duty cycling.
         *
         * Se resta un margen para no perder la primera lectura del ciclo siguiente por
         * unos pocos milisegundos de desfasaje.
         */
        val VENTANA_POR_DEFECTO_MILLIS =
            MotorEscaneoBle.INTERVALO_ESCANEO_MILLIS - MotorEscaneoBle.VENTANA_ESCANEO_MILLIS
    }
}
