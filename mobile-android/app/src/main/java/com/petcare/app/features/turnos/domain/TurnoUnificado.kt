package com.petcare.app.features.turnos.domain

import com.petcare.app.features.turnos.data.remote.MiReservaServicioResponse
import com.petcare.app.features.turnos.data.remote.MiTurnoResponse

enum class TipoTurnoItem { VETERINARIA, PASEADOR, GUARDERIA, PELUQUERIA }

/**
 * Vista unica que fusiona los turnos veterinarios (aceptar/rechazar) con los
 * turnos de servicios (confirmados automaticamente, solo se pueden cancelar)
 * para mostrarlos juntos en "Mis turnos".
 */
data class TurnoUnificado(
    val idTurno: Int,
    val tipo: TipoTurnoItem,
    val nombreMascota: String,
    val fecha: String,
    val horaInicio: String,
    val horaFin: String?,
    val contraparteNombre: String,
    val contraparteDetalle: String?,
    val nota: String?,
    val estado: String,
    val motivoNegativo: String?,
    val canceladoPor: String?,
    val puedeCancelar: Boolean
) {
    companion object {
        fun fromVeterinario(turno: MiTurnoResponse): TurnoUnificado = TurnoUnificado(
            idTurno = turno.idTurno,
            tipo = TipoTurnoItem.VETERINARIA,
            nombreMascota = turno.nombreMascota,
            fecha = turno.fecha,
            horaInicio = turno.hora,
            horaFin = null,
            contraparteNombre = turno.nombreVeterinaria,
            contraparteDetalle = turno.direccionVeterinaria,
            nota = turno.motivoConsulta,
            estado = turno.estado,
            motivoNegativo = turno.motivoRechazo,
            canceladoPor = null,
            puedeCancelar = false
        )

        fun fromServicio(turno: MiReservaServicioResponse): TurnoUnificado = TurnoUnificado(
            idTurno = turno.idTurno,
            tipo = when (turno.categoria) {
                "guarderia" -> TipoTurnoItem.GUARDERIA
                "peluqueria" -> TipoTurnoItem.PELUQUERIA
                else -> TipoTurnoItem.PASEADOR
            },
            nombreMascota = turno.nombreMascota,
            fecha = turno.fecha,
            horaInicio = turno.horaInicio,
            horaFin = turno.horaFin,
            contraparteNombre = turno.nombrePrestador,
            contraparteDetalle = turno.telefonoPrestador,
            nota = turno.notas,
            estado = turno.estado,
            motivoNegativo = turno.motivoCancelacion,
            canceladoPor = turno.canceladoPor,
            puedeCancelar = turno.estado == "confirmado"
        )
    }
}
