package com.petcare.app.features.auth.domain

object RegisterValidator {

    fun validateNombre(nombre: String): String? {
        if (nombre.isBlank()) {
            return "El nombre es obligatorio"
        }

        return null
    }

    fun validateApellido(apellido: String): String? {
        if (apellido.isBlank()) {
            return "El apellido es obligatorio"
        }

        return null
    }

    fun validateEmail(email: String): String? = LoginValidator.validateEmail(email)

    fun validatePassword(password: String): String? {
        if (password.isBlank()) {
            return "La contraseña es obligatoria"
        }

        if (password.length < 8) {
            return "La contraseña debe tener al menos 8 caracteres"
        }

        return null
    }

    fun validateConfirmPassword(password: String, confirmPassword: String): String? {
        if (confirmPassword.isBlank()) {
            return "Confirmá la contraseña"
        }

        if (confirmPassword != password) {
            return "Las contraseñas no coinciden"
        }

        return null
    }
}
