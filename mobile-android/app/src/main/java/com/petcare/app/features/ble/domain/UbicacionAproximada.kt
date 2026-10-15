package com.petcare.app.features.ble.domain

import android.annotation.SuppressLint
import android.content.Context
import com.google.android.gms.location.LocationServices
import kotlin.coroutines.resume
import kotlinx.coroutines.suspendCancellableCoroutine

/**
 * Donde se detecto el tag, con la precision que reporto el proveedor de ubicacion.
 *
 * Las coordenadas se guardan **crudas**: el redondeo a 3 decimales se aplica recien al
 * armar el payload, en [DeteccionesController], para que quede en un solo lugar.
 */
data class UbicacionAproximada(
    val latitud: Double,
    val longitud: Double,
    val precisionMetros: Int,
)

/**
 * Ultima ubicacion conocida del dispositivo, o `null` si no hay ninguna.
 *
 * Se usa `lastLocation` y no una peticion activa a proposito: pedir una posicion fresca
 * en cada deteccion encenderia el GPS todo el dia, que es justamente lo que el criterio
 * de aceptacion de bateria trata de evitar. Para "ubicacion aproximada" —que ademas se
 * redondea a ~110 m— la ultima conocida alcanza.
 *
 * Es el mismo patron que usa el mapa de prestadores
 * (`features/mapa/ui/MapaPrestadoresScreen.kt`).
 *
 * Devuelve `null` en vez de fallar: una deteccion sin ubicacion no se puede enviar
 * —US-31 la necesita— pero tampoco es motivo para cortar el escaneo.
 */
@SuppressLint("MissingPermission")
suspend fun obtenerUbicacionAproximada(context: Context): UbicacionAproximada? =
    suspendCancellableCoroutine { continuation ->
        val cliente = LocationServices.getFusedLocationProviderClient(context)
        runCatching {
            cliente.lastLocation
                .addOnSuccessListener { ubicacion ->
                    if (!continuation.isActive) return@addOnSuccessListener
                    continuation.resume(
                        ubicacion?.let {
                            UbicacionAproximada(
                                latitud = it.latitude,
                                longitud = it.longitude,
                                precisionMetros = it.accuracy.toInt(),
                            )
                        }
                    )
                }
                .addOnFailureListener {
                    if (continuation.isActive) continuation.resume(null)
                }
        }.onFailure {
            if (continuation.isActive) continuation.resume(null)
        }
    }
