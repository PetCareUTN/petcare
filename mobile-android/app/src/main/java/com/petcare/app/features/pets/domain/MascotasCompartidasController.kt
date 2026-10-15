package com.petcare.app.features.pets.domain

import com.petcare.app.features.pets.data.remote.CrearSolicitudCompartirRequest
import com.petcare.app.features.pets.data.remote.DuenoMascotaResponse
import com.petcare.app.features.pets.data.remote.MascotasCompartidasApi
import com.petcare.app.features.pets.data.remote.SolicitudCompartirResponse
import com.petcare.app.features.pets.data.remote.UsuarioEncontradoResponse

/**
 * Compartir una mascota con otros dueños (por ejemplo una pareja). El backend
 * resuelve los permisos: solo quien la registró comparte, y cualquiera puede
 * dejar de verla.
 */
class MascotasCompartidasController(
    private val api: MascotasCompartidasApi
) {

    /** Busca por email o por DNI: lo que tenga forma de email va como email. */
    suspend fun buscarUsuario(dato: String): UsuarioEncontradoResponse {
        val limpio = dato.trim()
        return if ("@" in limpio) {
            api.buscarUsuario(email = limpio)
        } else {
            api.buscarUsuario(documento = limpio)
        }
    }

    suspend fun solicitar(idMascota: Int, idUsuarioDestino: Int): SolicitudCompartirResponse =
        api.solicitar(CrearSolicitudCompartirRequest(idMascota, idUsuarioDestino))

    suspend fun listarRecibidas(): List<SolicitudCompartirResponse> = api.listarRecibidas()

    suspend fun listarEnviadas(idMascota: Int): List<SolicitudCompartirResponse> =
        api.listarEnviadas(idMascota)

    suspend fun aceptar(idSolicitud: Int): SolicitudCompartirResponse = api.aceptar(idSolicitud)

    suspend fun rechazar(idSolicitud: Int): SolicitudCompartirResponse = api.rechazar(idSolicitud)

    suspend fun cancelar(idSolicitud: Int): SolicitudCompartirResponse = api.cancelar(idSolicitud)

    suspend fun listarDuenios(idMascota: Int): List<DuenoMascotaResponse> =
        api.listarDuenios(idMascota)

    suspend fun salir(idMascota: Int) = api.salir(idMascota)

    suspend fun quitarDuenio(idMascota: Int, idUsuario: Int) =
        api.quitarDuenio(idMascota, idUsuario)
}
