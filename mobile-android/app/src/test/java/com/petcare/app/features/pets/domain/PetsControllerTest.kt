package com.petcare.app.features.pets.domain

import com.petcare.app.features.pets.data.remote.CreatePetRequest
import com.petcare.app.features.pets.data.remote.PetResponse
import com.petcare.app.features.pets.data.remote.PetsApi
import kotlinx.coroutines.runBlocking
import okhttp3.MultipartBody
import okhttp3.RequestBody
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

    @Test
    fun `createPet registra una mascota y devuelve la respuesta del backend`() =
        runBlocking {
            val fakePetsApi = FakePetsApi()
            val controller = PetsController(
                petsApi = fakePetsApi
            )
            val request = CreatePetRequest(
                nombre = "Nina",
                especie = "Perro",
                raza = "Mestiza",
                sexo = "hembra",
                birthDate = "2022-05-10",
                peso = 12.5,
                esterilizado = true,
                observaciones = "Sin observaciones"
            )

            val pet = controller.createPet(request)

            assertEquals(request, fakePetsApi.createdRequest)
            assertEquals("Nina", pet.nombre)
            assertEquals("Perro", pet.especie)
        }

    private class FakePetsApi : PetsApi {
        var createdRequest: CreatePetRequest? = null

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

        override suspend fun createPet(request: CreatePetRequest): PetResponse {
            createdRequest = request
            return PetResponse(
                id = 3,
                nombre = request.nombre,
                especie = request.especie,
                raza = request.raza,
                sexo = request.sexo,
                birthDate = request.birthDate,
                peso = request.peso,
                esterilizado = request.esterilizado,
                foto = null,
                observaciones = request.observaciones
            )
        }

        override suspend fun createPetWithPhoto(
            nombre: RequestBody,
            especie: RequestBody,
            raza: RequestBody?,
            sexo: RequestBody,
            birthDate: RequestBody?,
            peso: RequestBody?,
            esterilizado: RequestBody,
            observaciones: RequestBody?,
            foto: MultipartBody.Part
        ): PetResponse =
            throw UnsupportedOperationException("No usado en este test")
    }
}
