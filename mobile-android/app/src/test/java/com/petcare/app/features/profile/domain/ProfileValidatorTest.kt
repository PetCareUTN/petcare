package com.petcare.app.features.profile.domain

import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ProfileValidatorTest {

    @Test
    fun `validate acepta datos validos`() {
        val result = ProfileValidator.validate(
            nombre = "Ana",
            apellido = "Perez",
            email = "ana.perez@example.com",
            telefono = "+54 11 5555-5555"
        )

        assertTrue(result.isValid)
        assertNull(result.nombreError)
        assertNull(result.apellidoError)
        assertNull(result.emailError)
        assertNull(result.telefonoError)
    }

    @Test
    fun `validate acepta telefono vacio porque es opcional`() {
        val result = ProfileValidator.validate(
            nombre = "Ana",
            apellido = "Perez",
            email = "ana.perez@example.com",
            telefono = ""
        )

        assertTrue(result.isValid)
        assertNull(result.telefonoError)
    }

    @Test
    fun `validate rechaza campos obligatorios vacios`() {
        val result = ProfileValidator.validate(
            nombre = "",
            apellido = "",
            email = "",
            telefono = ""
        )

        assertFalse(result.isValid)
        assertTrue(result.nombreError != null)
        assertTrue(result.apellidoError != null)
        assertTrue(result.emailError != null)
    }

    @Test
    fun `validate rechaza nombre y apellido con digitos`() {
        val result = ProfileValidator.validate(
            nombre = "Ana2",
            apellido = "Perez3",
            email = "ana.perez@example.com",
            telefono = ""
        )

        assertFalse(result.isValid)
        assertTrue(result.nombreError != null)
        assertTrue(result.apellidoError != null)
    }

    @Test
    fun `validate rechaza email invalido`() {
        val result = ProfileValidator.validate(
            nombre = "Ana",
            apellido = "Perez",
            email = "no-es-un-email",
            telefono = ""
        )

        assertFalse(result.isValid)
        assertTrue(result.emailError != null)
    }

    @Test
    fun `validate rechaza telefono con letras`() {
        val result = ProfileValidator.validate(
            nombre = "Ana",
            apellido = "Perez",
            email = "ana.perez@example.com",
            telefono = "abc123"
        )

        assertFalse(result.isValid)
        assertTrue(result.telefonoError != null)
    }
}
