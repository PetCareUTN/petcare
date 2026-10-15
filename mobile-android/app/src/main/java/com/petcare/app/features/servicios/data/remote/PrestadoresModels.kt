package com.petcare.app.features.servicios.data.remote

data class DatosPrestador(
    val nombreCompleto: String = "", val numeroDocumento: String = "", val telefono: String = "",
    val experiencia: String = "", val referencias: String = "", val protocolo: String = "",
    val direccion: String = "", val capacidad: Int? = null
)
data class RevisionPrestador(val estado: String, val motivo: String, val fecha: String)
data class SolicitudPrestador(
    val id: Int, val categoria: String, val estado: String, val datos: DatosPrestador,
    val historial: List<RevisionPrestador>
)
data class ResenaPrestador(val puntuacion: Int, val comentario: String, val autor: String? = null)
data class ReservaPrestador(
    val idTurno: Int, val idPrestador: Int, val prestador: String, val categoria: String,
    val mascota: String, val fecha: String, val horaFin: String, val estado: String,
    val resena: ResenaPrestador?, val reporte: String?
)
data class PerfilPrestador(
    val identidadRevisada: Boolean, val referenciasComprobadas: Boolean,
    val serviciosCompletados: Int, val promedio: Double?, val resenas: List<ResenaPrestador>
)
