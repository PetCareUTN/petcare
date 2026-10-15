package com.petcare.app.features.pets.domain

import com.petcare.app.features.pets.data.remote.CreatePetRequest
import com.petcare.app.features.pets.data.remote.PetResponse
import com.petcare.app.features.pets.data.remote.PetsApi
import com.petcare.app.features.pets.data.remote.UpdatePetRequest
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.toRequestBody

class PetsController(
    private val petsApi: PetsApi
) {

    suspend fun getMyPets(): List<PetResponse> = petsApi.getMyPets()

    suspend fun getPetById(id: Int): PetResponse = petsApi.getPetById(id)

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
            alergias = request.alergias?.asTextBody(),
            foto = photo
        )

    suspend fun updatePet(id: Int, request: UpdatePetRequest): PetResponse =
        petsApi.updatePet(id, request)

    suspend fun updatePetWithPhoto(
        id: Int,
        request: UpdatePetRequest,
        photo: MultipartBody.Part
    ): PetResponse =
        petsApi.updatePetWithPhoto(
            id = id,
            nombre = request.nombre.asTextBody(),
            especie = request.especie.asTextBody(),
            raza = request.raza?.asTextBody(),
            sexo = request.sexo.asTextBody(),
            birthDate = request.birthDate?.asTextBody(),
            peso = request.peso?.toString()?.asTextBody(),
            esterilizado = request.esterilizado.toString().asTextBody(),
            observaciones = request.observaciones?.asTextBody(),
            alergias = request.alergias?.asTextBody(),
            foto = photo
        )

    private fun String.asTextBody(): RequestBody =
        toRequestBody("text/plain".toMediaType())
}
