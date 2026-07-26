package com.petcare.app.features.pets.domain

import com.petcare.app.features.pets.data.remote.PetResponse
import com.petcare.app.features.pets.data.remote.PetsApi
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Test

class PetsControllerTest {

    @Test
    fun `getMyPets devuelve las mascotas del usuario autenticado`() =
        runBlocking {
            val controller = PetsController(
                petsApi = FakePetsApi()
            )

            val pets = controller.getMyPets()

            assertEquals(2, pets.size)
            assertEquals("Rocky", pets[0].nombre)
            assertEquals("Luna", pets[1].nombre)
        }

    private class FakePetsApi : PetsApi {
        override suspend fun getMyPets(): List<PetResponse> =
            listOf(
                PetResponse(
                    id = 1,
                    nombre = "Rocky",
                    especie = "Perro",
                    raza = "Labrador",
                    sexo = "MACHO",
                    birthDate = "2023-03-10",
                    peso = 28.0,
                    esterilizado = true,
                    foto = null,
                    observaciones = null
                ),
                PetResponse(
                    id = 2,
                    nombre = "Luna",
                    especie = "Gato",
                    raza = null,
                    sexo = "HEMBRA",
                    birthDate = null,
                    peso = null,
                    esterilizado = false,
                    foto = null,
                    observaciones = null
                )
            )
    }
}
