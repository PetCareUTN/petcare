package com.petcare.app.features.pets.domain

data class PetRegistrationValidationResult(
    val nameError: String? = null,
    val speciesError: String? = null,
    val sexError: String? = null,
    val birthDateError: String? = null,
    val weightError: String? = null
) {
    val isValid: Boolean
        get() = nameError == null &&
            speciesError == null &&
            sexError == null &&
            birthDateError == null &&
            weightError == null
}

object PetRegistrationValidator {

    private val dateRegex = Regex("""^\d{4}-\d{2}-\d{2}$""")

    fun validate(
        name: String,
        species: String,
        sex: String,
        birthDate: String,
        weight: String
    ): PetRegistrationValidationResult {
        val trimmedName = name.trim()
        val trimmedSpecies = species.trim()
        val trimmedBirthDate = birthDate.trim()
        val trimmedWeight = weight.trim()

        return PetRegistrationValidationResult(
            nameError = when {
                trimmedName.isBlank() -> "Ingresa el nombre"
                trimmedName.length > 100 -> "El nombre no puede superar 100 caracteres"
                else -> null
            },
            speciesError = when {
                trimmedSpecies.isBlank() -> "Ingresa la especie"
                trimmedSpecies.length > 50 -> "La especie no puede superar 50 caracteres"
                else -> null
            },
            sexError = if (sex in setOf("macho", "hembra")) {
                null
            } else {
                "Selecciona el sexo"
            },
            birthDateError = when {
                trimmedBirthDate.isBlank() -> null
                !dateRegex.matches(trimmedBirthDate) -> "Usa el formato AAAA-MM-DD"
                else -> null
            },
            weightError = when {
                trimmedWeight.isBlank() -> null
                trimmedWeight.toDoubleOrNull() == null -> "Ingresa un peso valido"
                trimmedWeight.toDouble() < 0 -> "El peso no puede ser negativo"
                else -> null
            }
        )
    }
}
