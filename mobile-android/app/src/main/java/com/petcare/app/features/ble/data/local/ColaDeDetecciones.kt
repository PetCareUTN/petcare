package com.petcare.app.features.ble.data.local

import android.content.Context
import android.util.Log
import com.google.gson.Gson
import com.petcare.app.features.ble.data.remote.DeteccionRequest
import java.io.File

/**
 * Cola en disco de detecciones pendientes de enviar (US-30).
 *
 * Existe porque una mascota perdida no espera a que haya señal: el criterio de
 * aceptacion pide detectar, no detectar-solo-si-hay-internet. Lo que se detecta sin red
 * se guarda y se manda cuando vuelve.
 *
 * Es un archivo de una linea JSON por deteccion (JSON Lines) y no una base: el proyecto
 * no usa Room, el volumen es chico y el acceso es siempre "leer todo / reescribir
 * todo". Meter una dependencia nueva por esto seria desproporcionado.
 *
 * El `deteccionId` del payload se genera una sola vez y se reusa en cada reintento, asi
 * que reenviar una deteccion encolada nunca duplica nada del lado del backend.
 */
class ColaDeDetecciones internal constructor(
    private val archivo: File,
    private val maximo: Int = MAXIMO_PENDIENTES,
) {

    constructor(context: Context, maximo: Int = MAXIMO_PENDIENTES) :
        this(File(context.filesDir, NOMBRE_ARCHIVO), maximo)

    private val gson = Gson()
    private val candado = Any()

    /** Agrega una deteccion al final de la cola. */
    fun encolar(deteccion: DeteccionRequest) = synchronized(candado) {
        runCatching {
            archivo.appendText(gson.toJson(deteccion) + "\n")
            recortarSiHaceFalta()
        }.onFailure { Log.w(TAG, "No se pudo encolar la deteccion", it) }
        Unit
    }

    /** Las detecciones pendientes, de la mas vieja a la mas nueva. */
    fun pendientes(): List<DeteccionRequest> = synchronized(candado) {
        if (!archivo.exists()) return emptyList()

        return runCatching {
            archivo.readLines()
                .filter { it.isNotBlank() }
                .mapNotNull { linea ->
                    runCatching { gson.fromJson(linea, DeteccionRequest::class.java) }.getOrNull()
                }
        }.getOrElse {
            Log.w(TAG, "No se pudo leer la cola", it)
            emptyList()
        }
    }

    /** Saca de la cola las detecciones ya enviadas, por `deteccionId`. */
    fun quitar(deteccionIds: Set<String>) = synchronized(candado) {
        if (deteccionIds.isEmpty()) return

        runCatching {
            val quedan = pendientesSinCandado().filterNot { it.deteccionId in deteccionIds }
            reescribir(quedan)
        }.onFailure { Log.w(TAG, "No se pudo actualizar la cola", it) }
        Unit
    }

    fun vaciar() = synchronized(candado) {
        runCatching { archivo.delete() }
        Unit
    }

    private fun pendientesSinCandado(): List<DeteccionRequest> =
        if (!archivo.exists()) {
            emptyList()
        } else {
            archivo.readLines()
                .filter { it.isNotBlank() }
                .mapNotNull { linea ->
                    runCatching { gson.fromJson(linea, DeteccionRequest::class.java) }.getOrNull()
                }
        }

    /**
     * Si el telefono pasa mucho tiempo sin red, la cola no puede crecer sin limite.
     *
     * Se descartan las **mas viejas**: una deteccion de hace horas ya no ayuda a
     * encontrar una mascota que se esta moviendo, mientras que la ultima si.
     */
    private fun recortarSiHaceFalta() {
        val pendientes = pendientesSinCandado()
        if (pendientes.size <= maximo) return

        Log.w(TAG, "Cola llena (${pendientes.size}), se descartan las mas viejas")
        reescribir(pendientes.takeLast(maximo))
    }

    private fun reescribir(detecciones: List<DeteccionRequest>) {
        if (detecciones.isEmpty()) {
            archivo.delete()
            return
        }
        archivo.writeText(detecciones.joinToString("\n") { gson.toJson(it) } + "\n")
    }

    companion object {
        private const val TAG = "ColaDeDetecciones"
        private const val NOMBRE_ARCHIVO = "detecciones-pendientes.jsonl"
        const val MAXIMO_PENDIENTES = 500
    }
}
