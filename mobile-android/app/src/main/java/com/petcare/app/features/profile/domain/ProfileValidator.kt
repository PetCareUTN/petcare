package com.petcare.app.features.profile.domain

data class ProfileValidationResult(
    val nombreError: String? = null,
    val apellidoError: String? = null,
    val emailError: String? = null,
    val telefonoError: String? = null
) {
    val isValid: Boolean
        get() = nombreError == null &&
            apellidoError == null &&
            emailError == null &&
            telefonoError == null
}

/**
 * Replica las reglas del backend (UpdateUserDto) para dar feedback
 * inmediato antes de llamar a PATCH /users/me.
 */
object ProfileValidator {

    private val nombreRegex =
        Regex("^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ'\\-\\s]*$")
    private val emailRegex =
        Regex("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")
    private val telefonoRegex =
        Regex("^[0-9+\\-\\s()]+$")

    fun validate(
        nombre: String,
        apellido: String,
        email: String,
        telefono: String
    ): ProfileValidationResult {
        val trimmedNombre = nombre.trim()
        val trimmedApellido = apellido.trim()
        val trimmedEmail = email.trim()
        val trimmedTelefono = telefono.trim()

        return ProfileValidationResult(
            nombreError = when {
                trimmedNombre.isBlank() -> "El nombre es obligatorio"
                trimmedNombre.length > 100 -> "El nombre no puede superar 100 caracteres"
                !nombreRegex.matches(trimmedNombre) -> "El nombre solo puede contener letras"
                else -> null
            },
            apellidoError = when {
                trimmedApellido.isBlank() -> "El apellido es obligatorio"
                trimmedApellido.length > 100 -> "El apellido no puede superar 100 caracteres"
                !nombreRegex.matches(trimmedApellido) -> "El apellido solo puede contener letras"
                else -> null
            },
            emailError = when {
                trimmedEmail.isBlank() -> "El correo electrónico es obligatorio"
                !emailRegex.matches(trimmedEmail) -> "Ingresá un correo electrónico válido"
                else -> null
            },
            telefonoError = when {
                trimmedTelefono.isBlank() -> null
                trimmedTelefono.length > 30 -> "El teléfono no puede superar 30 caracteres"
                !telefonoRegex.matches(trimmedTelefono) -> "El teléfono solo puede contener números"
                else -> null
            }
        )
    }
}
