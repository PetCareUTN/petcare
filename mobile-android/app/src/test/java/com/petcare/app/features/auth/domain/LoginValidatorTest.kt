package com.petcare.app.features.auth.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class LoginValidatorTest {

    @Test
    fun `email vacio devuelve error`() {
        val result = LoginValidator.validateEmail("")

        assertEquals(
            "El correo electrónico es obligatorio",
            result
        )
    }

    @Test
    fun `email invalido devuelve error`() {
        val result = LoginValidator.validateEmail("correo-invalido")

        assertEquals(
            "Ingresá un correo electrónico válido",
            result
        )
    }

    @Test
    fun `email valido no devuelve error`() {
        val result = LoginValidator.validateEmail("usuario@petcare.com")

        assertNull(result)
    }

    @Test
    fun `email valido elimina espacios externos`() {
        val result = LoginValidator.validateEmail(
            "  usuario@petcare.com  "
        )

        assertNull(result)
    }

    @Test
    fun `password vacia devuelve error`() {
        val result = LoginValidator.validatePassword("")

        assertEquals(
            "La contraseña es obligatoria",
            result
        )
    }

    @Test
    fun `password valida no devuelve error`() {
        val result = LoginValidator.validatePassword("ClaveSegura123")

        assertNull(result)
    }
}