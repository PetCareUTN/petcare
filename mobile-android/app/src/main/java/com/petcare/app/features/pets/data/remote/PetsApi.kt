package com.petcare.app.features.pets.data.remote

import com.google.gson.annotations.SerializedName
import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Path

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
    val observaciones: String?,
    val alergias: String?
)

data class CreatePetRequest(
    val nombre: String,
    val especie: String,
    val raza: String?,
    val sexo: String,

    @SerializedName("fechaNacimiento")
    val birthDate: String?,

    val peso: Double?,
    val esterilizado: Boolean,
    val observaciones: String?,
    val alergias: String?
)

data class UpdatePetRequest(
    val nombre: String,
    val especie: String,
    val raza: String?,
    val sexo: String,

    @SerializedName("fechaNacimiento")
    val birthDate: String?,

    val peso: Double?,
    val esterilizado: Boolean,
    val observaciones: String?,
    val alergias: String?
)

interface PetsApi {

    @GET("mascotas")
    suspend fun getMyPets(): List<PetResponse>

    @GET("mascotas/{id}")
    suspend fun getPetById(
        @Path("id") id: Int
    ): PetResponse

    @POST("mascotas")
    suspend fun createPet(
        @Body request: CreatePetRequest
    ): PetResponse

    @Multipart
    @POST("mascotas")
    suspend fun createPetWithPhoto(
        @Part("nombre") nombre: RequestBody,
        @Part("especie") especie: RequestBody,
        @Part("raza") raza: RequestBody?,
        @Part("sexo") sexo: RequestBody,
        @Part("fechaNacimiento") birthDate: RequestBody?,
        @Part("peso") peso: RequestBody?,
        @Part("esterilizado") esterilizado: RequestBody,
        @Part("observaciones") observaciones: RequestBody?,
        @Part("alergias") alergias: RequestBody?,
        @Part foto: MultipartBody.Part
    ): PetResponse

    @PATCH("mascotas/{id}")
    suspend fun updatePet(
        @Path("id") id: Int,
        @Body request: UpdatePetRequest
    ): PetResponse

    @Multipart
    @PATCH("mascotas/{id}")
    suspend fun updatePetWithPhoto(
        @Path("id") id: Int,
        @Part("nombre") nombre: RequestBody,
        @Part("especie") especie: RequestBody,
        @Part("raza") raza: RequestBody?,
        @Part("sexo") sexo: RequestBody,
        @Part("fechaNacimiento") birthDate: RequestBody?,
        @Part("peso") peso: RequestBody?,
        @Part("esterilizado") esterilizado: RequestBody,
        @Part("observaciones") observaciones: RequestBody?,
        @Part("alergias") alergias: RequestBody?,
        @Part foto: MultipartBody.Part
    ): PetResponse
}
