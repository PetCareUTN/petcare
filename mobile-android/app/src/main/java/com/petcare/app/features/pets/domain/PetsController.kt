package com.petcare.app.features.pets.domain

import com.petcare.app.features.pets.data.remote.PetResponse
import com.petcare.app.features.pets.data.remote.PetsApi

class PetsController(
    private val petsApi: PetsApi
) {

    suspend fun getMyPets(): List<PetResponse> = petsApi.getMyPets()
}
