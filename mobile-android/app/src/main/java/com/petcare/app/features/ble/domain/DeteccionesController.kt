package com.petcare.app.features.ble.domain

import android.content.Context
import android.util.Log
import com.petcare.app.features.ble.data.local.ColaDeDetecciones
import com.petcare.app.features.ble.data.remote.DeteccionRequest
import com.petcare.app.features.ble.data.remote.DeteccionesApi
import com.petcare.app.features.ble.data.remote.DeteccionesRetrofit
import java.util.UUID
import retrofit2.HttpException

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
     *
     * La excepcion es un rechazo definitivo del backend (ver [esRechazoDefinitivo]): esa
     * deteccion se saca de la cola y se sigue con la proxima, porque reintentarla daria
     * el mismo error para siempre y trabaria a todas las que vienen atras.
     */
    suspend fun vaciarCola() {
        val pendientes = cola.pendientes()
        if (pendientes.isEmpty()) return

        val enviadas = mutableSetOf<String>()
        for (deteccion in pendientes) {
            val error = runCatching { api.registrarDeteccion(deteccion) }.exceptionOrNull()
            if (error != null && !esRechazoDefinitivo(error)) {
                Log.d(TAG, "Envio interrumpido, quedan ${pendientes.size - enviadas.size}")
                break
            }
            if (error != null) {
                Log.w(TAG, "Deteccion ${deteccion.deteccionId} rechazada por el backend, se descarta", error)
            }
            // Enviada o rechazada para siempre: en los dos casos sale de la cola.
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

/**
 * Si el backend rechazo la deteccion por ser invalida, y no por un problema pasajero.
 *
 * `POST /detecciones` responde 202 a toda deteccion bien formada, se guarde o no (US-31),
 * asi que un 4xx significa que el payload esta mal y reenviarlo no lo va a arreglar.
 * Red caida, timeouts y 5xx si se reintentan, igual que 408 y 429: son 4xx pero hablan
 * del momento, no del payload.
 */
internal fun esRechazoDefinitivo(error: Throwable): Boolean =
    error is HttpException && error.code() in 400..499 && error.code() !in setOf(408, 429)
