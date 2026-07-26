package com.petcare.app.features.pets.domain

import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class PetRegistrationValidatorTest {

    @Test
    fun `validate acepta datos obligatorios validos`() {
        val result = PetRegistrationValidator.validate(
            name = "Nina",
            species = "Perro",
            sex = "hembra",
            birthDate = "",
            weight = ""
        )

        assertTrue(result.isValid)
        assertNull(result.nameError)
        assertNull(result.speciesError)
        assertNull(result.sexError)
    }

    @Test
    fun `validate rechaza campos obligatorios vacios`() {
        val result = PetRegistrationValidator.validate(
            name = "",
            species = "",
            sex = "",
            birthDate = "",
            weight = ""
        )

        assertFalse(result.isValid)
        assertTrue(result.nameError != null)
        assertTrue(result.speciesError != null)
        assertTrue(result.sexError != null)
    }

    @Test
    fun `validate rechaza fecha y peso invalidos`() {
        val result = PetRegistrationValidator.validate(
            name = "Nina",
            species = "Perro",
            sex = "hembra",
            birthDate = "10-05-2022",
            weight = "-1"
        )

        assertFalse(result.isValid)
        assertTrue(result.birthDateError != null)
        assertTrue(result.weightError != null)
    }
}
