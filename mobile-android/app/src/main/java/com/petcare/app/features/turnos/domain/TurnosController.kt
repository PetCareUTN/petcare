package com.petcare.app.features.turnos.domain

import com.petcare.app.features.turnos.data.remote.CancelarTurnoVeterinarioRequest
import com.petcare.app.features.turnos.data.remote.CreateTurnoRequest
import com.petcare.app.features.turnos.data.remote.DisponibilidadTurnoResponse
import com.petcare.app.features.turnos.data.remote.MiTurnoResponse
import com.petcare.app.features.turnos.data.remote.TurnoResponse
import com.petcare.app.features.turnos.data.remote.TurnosApi
import com.petcare.app.features.turnos.data.remote.VeterinariaResponse

class TurnosController(
    private val turnosApi: TurnosApi
) {

    suspend fun getMisTurnos(): List<MiTurnoResponse> =
        turnosApi.getMisTurnos()

    suspend fun getVeterinariasAprobadas(): List<VeterinariaResponse> =
        turnosApi.getVeterinariasAprobadas()

    suspend fun getDisponibilidades(idVeterinario: Int): List<DisponibilidadTurnoResponse> =
        turnosApi.getDisponibilidades(idVeterinario)

    suspend fun getHorariosDisponibles(idVeterinario: Int, fecha: String): List<String> =
        turnosApi.getHorariosDisponibles(idVeterinario, fecha)

    suspend fun solicitarTurno(request: CreateTurnoRequest): TurnoResponse =
        turnosApi.solicitarTurno(request)

    suspend fun cancelar(idTurno: Int, motivoCancelacion: String?): TurnoResponse =
        turnosApi.cancelar(idTurno, CancelarTurnoVeterinarioRequest(motivoCancelacion))
}
