package com.petcare.app.features.servicios.domain

import com.petcare.app.features.servicios.data.remote.DisponibilidadRequest
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ServicioValidatorTest {

    @Test
    fun `validate acepta una categoria y disponibilidad validas`() {
        val result = ServicioValidator.validate(
            categoria = "paseador",
            disponibilidades = listOf(
                DisponibilidadRequest(
                    diaSemana = "lunes",
                    horaInicio = "09:00",
                    horaFin = "12:00"
                )
            )
        )

        assertTrue(result.isValid)
        assertNull(result.categoriaError)
        assertNull(result.disponibilidadesError)
    }

    @Test
    fun `validate rechaza categoria vacia`() {
        val result = ServicioValidator.validate(
            categoria = "",
            disponibilidades = listOf(
                DisponibilidadRequest(
                    diaSemana = "lunes",
                    horaInicio = "09:00",
                    horaFin = "12:00"
                )
            )
        )

        assertFalse(result.isValid)
        assertTrue(result.categoriaError != null)
    }

    @Test
    fun `validate rechaza cuando no hay disponibilidades`() {
        val result = ServicioValidator.validate(
            categoria = "guarderia",
            disponibilidades = emptyList()
        )

        assertFalse(result.isValid)
        assertTrue(result.disponibilidadesError != null)
    }

    @Test
    fun `validate rechaza dia u horario incompletos`() {
        val result = ServicioValidator.validate(
            categoria = "peluqueria",
            disponibilidades = listOf(
                DisponibilidadRequest(
                    diaSemana = "",
                    horaInicio = "09:00",
                    horaFin = "12:00"
                )
            )
        )

        assertFalse(result.isValid)
        assertTrue(result.disponibilidadesError != null)
    }

    @Test
    fun `validate rechaza cuando la hora de inicio no es anterior a la hora de fin`() {
        val result = ServicioValidator.validate(
            categoria = "paseador",
            disponibilidades = listOf(
                DisponibilidadRequest(
                    diaSemana = "martes",
                    horaInicio = "12:00",
                    horaFin = "10:00"
                )
            )
        )

        assertFalse(result.isValid)
        assertTrue(result.disponibilidadesError != null)
    }

    @Test
    fun `validate rechaza cuando alguna disponibilidad de varias es invalida`() {
        val result = ServicioValidator.validate(
            categoria = "paseador",
            disponibilidades = listOf(
                DisponibilidadRequest(
                    diaSemana = "lunes",
                    horaInicio = "09:00",
                    horaFin = "12:00"
                ),
                DisponibilidadRequest(
                    diaSemana = "miercoles",
                    horaInicio = "",
                    horaFin = "10:00"
                )
            )
        )

        assertFalse(result.isValid)
        assertTrue(result.disponibilidadesError != null)
    }
}
