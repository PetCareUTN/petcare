package com.petcare.app.features.servicios.domain

import com.petcare.app.features.servicios.data.remote.DisponibilidadRequest

data class ServicioValidationResult(
    val categoriaError: String? = null,
    val disponibilidadesError: String? = null
) {
    val isValid: Boolean
        get() = categoriaError == null && disponibilidadesError == null
}

object ServicioValidator {

    fun validate(
        categoria: String,
        disponibilidades: List<DisponibilidadRequest>
    ): ServicioValidationResult {
        val categoriaError = if (categoria.isBlank()) "Selecciona una categoria" else null

        val disponibilidadesError = when {
            disponibilidades.isEmpty() -> "Agrega al menos una disponibilidad"
            disponibilidades.any { it.diaSemana.isBlank() } ->
                "Selecciona el dia para cada disponibilidad"
            disponibilidades.any { it.horaInicio.isBlank() || it.horaFin.isBlank() } ->
                "Completa el horario de cada disponibilidad"
            disponibilidades.any { it.horaInicio >= it.horaFin } ->
                "La hora de inicio debe ser anterior a la hora de fin"
            else -> null
        }

        return ServicioValidationResult(
            categoriaError = categoriaError,
            disponibilidadesError = disponibilidadesError
        )
    }
}
