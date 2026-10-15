package com.petcare.app.features.auth.data.remote

import com.google.gson.Gson
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ResetPasswordRequestTest {

    @Test
    fun `serializa nueva contrasena con el nombre esperado por el backend`() {
        val json = Gson().toJson(
            ResetPasswordRequest(
                email = "dueno@petcare.test",
                codigo = "123456",
                nuevaContrasena = "NuevaClave123"
            )
        )

        assertTrue(json.contains("\"nuevaContraseña\":\"NuevaClave123\""))
        assertFalse(json.contains("nuevaContrasena"))
    }

    @Test
    fun `incluye email y codigo para activar una cuenta asistida`() {
        val json = Gson().toJson(
            ResetPasswordRequest(
                email = "dueno@petcare.test",
                codigo = "123456",
                nuevaContrasena = "NuevaClave123"
            )
        )

        assertTrue(json.contains("\"email\":\"dueno@petcare.test\""))
        assertTrue(json.contains("\"codigo\":\"123456\""))
    }
}
