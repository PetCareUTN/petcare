package com.petcare.app.features.pets.data.remote

import com.google.gson.annotations.SerializedName
import retrofit2.http.GET

data class PetResponse(
    @SerializedName("idMascota")
    val id: Int,

    val nombre: String,
    val especie: String,
    val raza: String?,
    val sexo: String,

    @SerializedName("fechaNacimiento")
    val birthDate: String?,

    val peso: Double?,
    val esterilizado: Boolean,
    val foto: String?,
    val observaciones: String?
)

interface PetsApi {

    @GET("mascotas")
    suspend fun getMyPets(): List<PetResponse>
}
