package com.petcare.app.features.auth.domain

object LoginValidator {

    fun validateEmail(email: String): String? {
        val normalizedEmail = email.trim()

        if (normalizedEmail.isEmpty()) {
            return "El correo electrónico es obligatorio"
        }

        val emailRegex =
            Regex("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")

        if (!emailRegex.matches(normalizedEmail)) {
            return "Ingresá un correo electrónico válido"
        }

        return null
    }

    fun validatePassword(password: String): String? {
        if (password.isBlank()) {
            return "La contraseña es obligatoria"
        }

        return null
    }
}