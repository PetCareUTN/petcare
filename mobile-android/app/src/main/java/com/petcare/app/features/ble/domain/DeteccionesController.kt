package com.petcare.app.features.ble.domain

import android.content.Context
import android.util.Log
import com.petcare.app.features.ble.data.local.ColaDeDetecciones
import com.petcare.app.features.ble.data.remote.DeteccionRequest
import com.petcare.app.features.ble.data.remote.DeteccionesApi
import com.petcare.app.features.ble.data.remote.DeteccionesRetrofit
import java.util.UUID

/**
 * Convierte lo que ve el motor de escaneo en detecciones enviadas al backend (US-30).
 *
 * El recorrido de una lectura es:
 *
 * 1. [AntiRepeticion] descarta las repeticiones del mismo tag dentro del mismo ciclo.
 * 2. Se le agrega la ubicacion aproximada del detector, redondeada a 3 decimales.
 * 3. Se encola en disco, con su `deteccionId` ya generado.
 * 4. Se intenta vaciar la cola contra `POST /detecciones`.
 *
 * Encolar **antes** de intentar el envio es a proposito: si el proceso muere entre el
 * intento y la confirmacion, la deteccion sigue en la cola y se reintenta. Como el
 * `deteccionId` se genera una sola vez y viaja igual en cada reintento, el backend
 * deduplica solo.
 *
 * Ver docs/spike-escaneo-ble-segundo-plano.md, punto 5.
 */
class DeteccionesController(
    private val context: Context,
    private val cola: ColaDeDetecciones = ColaDeDetecciones(context),
    private val api: DeteccionesApi = DeteccionesRetrofit.api,
    private val antiRepeticion: AntiRepeticion = AntiRepeticion(),
) {

    /**
     * Procesa una lectura del motor.
     *
     * No lanza: una deteccion que no se puede registrar no debe cortar el escaneo.
     */
    suspend fun registrar(deteccion: TagDetectado) {
        if (!antiRepeticion.deberiaEnviar(deteccion.tagId, deteccion.detectadoEnMillis)) return

        val ubicacion = obtenerUbicacionAproximada(context)
        if (ubicacion == null) {
            // US-31 necesita coordenadas para triangular, asi que una deteccion sin
            // ubicacion no sirve. No se encola: ocuparia lugar sin poder enviarse nunca.
            Log.w(TAG, "Deteccion de ${deteccion.tagId} descartada: sin ubicacion conocida")
            return
        }

        cola.encolar(
            DeteccionRequest(
                deteccionId = UUID.randomUUID().toString(),
                tagId = deteccion.tagId,
                rssi = deteccion.rssi,
                detectadoEn = formatearInstanteUtc(deteccion.detectadoEnMillis),
                latitud = redondearCoordenada(ubicacion.latitud),
                longitud = redondearCoordenada(ubicacion.longitud),
                precisionMetros = ubicacion.precisionMetros,
            )
        )

        vaciarCola()
    }

    /**
     * Intenta enviar todo lo pendiente.
     *
     * Se corta al primer fallo: si no hay red, seguir intentando con el resto solo gasta
     * bateria. Lo que quedo sin enviar se reintenta en la proxima deteccion.
     */
    suspend fun vaciarCola() {
        val pendientes = cola.pendientes()
        if (pendientes.isEmpty()) return

        val enviadas = mutableSetOf<String>()
        for (deteccion in pendientes) {
            val resultado = runCatching { api.registrarDeteccion(deteccion) }
            if (resultado.isFailure) {
                Log.d(TAG, "Envio interrumpido, quedan ${pendientes.size - enviadas.size}")
                break
            }
            enviadas += deteccion.deteccionId
        }

        if (enviadas.isNotEmpty()) {
            cola.quitar(enviadas)
            Log.d(TAG, "Enviadas ${enviadas.size} detecciones")
        }
    }

    private companion object {
        const val TAG = "DeteccionesController"
    }
}
