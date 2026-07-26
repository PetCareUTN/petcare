package com.petcare.app.features.pets.domain

import com.petcare.app.features.pets.data.remote.CreatePetRequest
import com.petcare.app.features.pets.data.remote.PetResponse
import com.petcare.app.features.pets.data.remote.PetsApi
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.toRequestBody

class PetsController(
    private val petsApi: PetsApi
) {

    suspend fun getMyPets(): List<PetResponse> = petsApi.getMyPets()

    suspend fun createPet(request: CreatePetRequest): PetResponse =
        petsApi.createPet(request)

    suspend fun createPetWithPhoto(
        request: CreatePetRequest,
        photo: MultipartBody.Part
    ): PetResponse =
        petsApi.createPetWithPhoto(
            nombre = request.nombre.asTextBody(),
            especie = request.especie.asTextBody(),
            raza = request.raza?.asTextBody(),
            sexo = request.sexo.asTextBody(),
            birthDate = request.birthDate?.asTextBody(),
            peso = request.peso?.toString()?.asTextBody(),
            esterilizado = request.esterilizado.toString().asTextBody(),
            observaciones = request.observaciones?.asTextBody(),
            foto = photo
        )

    private fun String.asTextBody(): RequestBody =
        toRequestBody("text/plain".toMediaType())
}
