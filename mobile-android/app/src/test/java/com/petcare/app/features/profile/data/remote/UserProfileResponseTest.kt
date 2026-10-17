package com.petcare.app.features.profile.data.remote

import com.google.gson.Gson
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * El backend devuelve `apellido` en null para las cuentas creadas con Google:
 * Google entrega el nombre, no el apellido. Gson no respeta los tipos no
 * nulos de Kotlin, asi que un campo declarado `String` igual termina
 * valiendo null en tiempo de ejecucion y revienta recien al dibujarlo.
 */
class UserProfileResponseTest {

    private val gson = Gson()

    @Test
    fun `deserializa un perfil de Google sin apellido`() {
        val json = """
            {
              "id_usuario": 27,
              "nombre": "Mauricio",
              "apellido": null,
              "email": "mauri@example.com",
              "telefono": null,
              "foto": null,
              "id_rol": 1,
              "estado": "activo",
              "fecha_registro": "2026-10-16T03:33:35.068Z",
              "recordatorios_vacunas": true
            }
        """.trimIndent()

        val perfil = gson.fromJson(json, UserProfileResponse::class.java)

        assertEquals("Mauricio", perfil.nombre)
        assertNull(perfil.apellido)
    }

    @Test
    fun `nombreCompleto usa solo el nombre cuando no hay apellido`() {
        val perfil = perfilDePrueba(apellido = null)

        assertEquals("Mauricio", perfil.nombreCompleto)
    }

    @Test
    fun `nombreCompleto junta nombre y apellido cuando los dos estan`() {
        val perfil = perfilDePrueba(apellido = "Herrera")

        assertEquals("Mauricio Herrera", perfil.nombreCompleto)
    }

    @Test
    fun `nombreCompleto ignora un apellido en blanco`() {
        val perfil = perfilDePrueba(apellido = "   ")

        assertEquals("Mauricio", perfil.nombreCompleto)
    }

    private fun perfilDePrueba(apellido: String?) = UserProfileResponse(
        id = 27,
        nombre = "Mauricio",
        apellido = apellido,
        email = "mauri@example.com",
        telefono = null,
        roleId = 1,
        estado = "activo",
        registrationDate = "2026-10-16T03:33:35.068Z"
    )
}
