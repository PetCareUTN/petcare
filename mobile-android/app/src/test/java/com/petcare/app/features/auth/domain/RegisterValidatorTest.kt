package com.petcare.app.features.auth.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class RegisterValidatorTest {

    @Test
    fun `nombre vacio devuelve error`() {
        val result = RegisterValidator.validateNombre("")

        assertEquals("El nombre es obligatorio", result)
    }

    @Test
    fun `nombre valido no devuelve error`() {
        val result = RegisterValidator.validateNombre("Sofia")

        assertNull(result)
    }

    @Test
    fun `apellido vacio devuelve error`() {
        val result = RegisterValidator.validateApellido("")

        assertEquals("El apellido es obligatorio", result)
    }

    @Test
    fun `apellido valido no devuelve error`() {
        val result = RegisterValidator.validateApellido("Muñoz")

        assertNull(result)
    }

    @Test
    fun `email invalido devuelve error`() {
        val result = RegisterValidator.validateEmail("correo-invalido")

        assertEquals("Ingresá un correo electrónico válido", result)
    }

    @Test
    fun `email valido no devuelve error`() {
        val result = RegisterValidator.validateEmail("usuario@petcare.com")

        assertNull(result)
    }

    @Test
    fun `password corta devuelve error`() {
        val result = RegisterValidator.validatePassword("1234567")

        assertEquals("La contraseña debe tener al menos 8 caracteres", result)
    }

    @Test
    fun `password vacia devuelve error`() {
        val result = RegisterValidator.validatePassword("")

        assertEquals("La contraseña es obligatoria", result)
    }

    @Test
    fun `password valida no devuelve error`() {
        val result = RegisterValidator.validatePassword("ClaveSegura123")

        assertNull(result)
    }

    @Test
    fun `confirmacion vacia devuelve error`() {
        val result = RegisterValidator.validateConfirmPassword(
            password = "ClaveSegura123",
            confirmPassword = ""
        )

        assertEquals("Confirmá la contraseña", result)
    }

    @Test
    fun `confirmacion distinta devuelve error`() {
        val result = RegisterValidator.validateConfirmPassword(
            password = "ClaveSegura123",
            confirmPassword = "OtraClave123"
        )

        assertEquals("Las contraseñas no coinciden", result)
    }

    @Test
    fun `confirmacion igual no devuelve error`() {
        val result = RegisterValidator.validateConfirmPassword(
            password = "ClaveSegura123",
            confirmPassword = "ClaveSegura123"
        )

        assertNull(result)
    }
}
