package com.petcare.app.features.profile.data.remote

import com.google.gson.annotations.SerializedName
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST

data class UserProfileResponse(
    @SerializedName("id_usuario")
    val id: Int,

    val nombre: String,
    val apellido: String,
    val email: String,
    val telefono: String?,

    @SerializedName("id_rol")
    val roleId: Int,

    val estado: String,

    @SerializedName("fecha_registro")
    val registrationDate: String,

    /** US-40: en que estado mostrar el toggle de recordatorios de vacunacion. */
    @SerializedName("recordatorios_vacunas")
    val recordatoriosVacunas: Boolean = true
)

data class UpdateProfileRequest(
    val nombre: String?,
    val apellido: String?,
    val email: String?,
    val telefono: String?
)

data class RequestEmailChangeRequest(
    val nuevoEmail: String
)

data class ConfirmEmailChangeRequest(
    val codigo: String
)

/** Preferencias de notificaciones del usuario (US-40). */
data class UpdatePreferenciasRequest(
    val recordatoriosVacunas: Boolean
)

data class MessageResponse(
    val mensaje: String
)

interface ProfileApi {

    @GET("auth/me")
    suspend fun getMyProfile(): UserProfileResponse

    @PATCH("users/me")
    suspend fun updateMyProfile(
        @Body request: UpdateProfileRequest
    ): UserProfileResponse

    @POST("users/me/cambiar-email")
    suspend fun requestEmailChange(
        @Body request: RequestEmailChangeRequest
    ): MessageResponse

    @PATCH("users/me/confirmar-email")
    suspend fun confirmEmailChange(
        @Body request: ConfirmEmailChangeRequest
    ): MessageResponse

    @PATCH("users/me/preferencias")
    suspend fun updatePreferencias(
        @Body request: UpdatePreferenciasRequest
    ): UserProfileResponse
}
