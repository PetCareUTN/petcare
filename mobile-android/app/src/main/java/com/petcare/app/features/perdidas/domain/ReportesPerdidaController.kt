package com.petcare.app.features.perdidas.domain

import com.petcare.app.features.perdidas.data.remote.CreateReportePerdidaRequest
import com.petcare.app.features.perdidas.data.remote.ReportePerdidaResponse
import com.petcare.app.features.perdidas.data.remote.ReportesPerdidaApi

class ReportesPerdidaController(
    private val reportesPerdidaApi: ReportesPerdidaApi
) {

    suspend fun reportar(request: CreateReportePerdidaRequest): ReportePerdidaResponse =
        reportesPerdidaApi.reportar(request)

    suspend fun getMisReportesActivos(): List<ReportePerdidaResponse> =
        reportesPerdidaApi.getMisReportesActivos()

    suspend fun cerrar(idReporte: Int): ReportePerdidaResponse =
        reportesPerdidaApi.cerrar(idReporte)
}
