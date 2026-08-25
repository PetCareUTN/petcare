package com.petcare.app.features.turnos.domain

import com.petcare.app.features.turnos.data.remote.CancelarTurnoServicioRequest
import com.petcare.app.features.turnos.data.remote.CreateTurnoServicioRequest
import com.petcare.app.features.turnos.data.remote.MiReservaServicioResponse
import com.petcare.app.features.turnos.data.remote.ReservaServicioRecibidaResponse
import com.petcare.app.features.turnos.data.remote.TurnosServiciosApi

class TurnosServiciosController(
    private val turnosServiciosApi: TurnosServiciosApi
) {

    suspend fun getMisReservas(): List<MiReservaServicioResponse> =
        turnosServiciosApi.getMisReservas()

    suspend fun getRecibidas(): List<ReservaServicioRecibidaResponse> =
        turnosServiciosApi.getRecibidas()

    suspend fun solicitar(request: CreateTurnoServicioRequest): ReservaServicioRecibidaResponse =
        turnosServiciosApi.solicitar(request)

    suspend fun cancelar(idTurno: Int, motivoCancelacion: String?) =
        turnosServiciosApi.cancelar(idTurno, CancelarTurnoServicioRequest(motivoCancelacion))
}
