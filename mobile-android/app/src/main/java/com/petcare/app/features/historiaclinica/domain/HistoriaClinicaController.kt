package com.petcare.app.features.historiaclinica.domain

import com.petcare.app.features.historiaclinica.data.remote.HistoriaClinicaApi
import com.petcare.app.features.historiaclinica.data.remote.HistoriaClinicaResponse

class HistoriaClinicaController(
    private val historiaClinicaApi: HistoriaClinicaApi
) {

    suspend fun getHistoriaClinica(idMascota: Int): HistoriaClinicaResponse =
        historiaClinicaApi.getHistoriaClinica(idMascota)
}
