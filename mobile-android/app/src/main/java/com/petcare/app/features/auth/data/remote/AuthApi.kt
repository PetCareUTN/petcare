package com.petcare.app.features.auth.data.remote

import com.google.gson.annotations.SerializedName
import retrofit2.http.Body
import retrofit2.http.PATCH
import retrofit2.http.POST

data class LoginRequest(
    val email: String,
    val password: String
)

data class LoginResponse(
    val token: String,
    val usuario: UserResponse
)

data class UserResponse(
    @SerializedName("id_usuario")
    val id: Int,

    val nombre: String,
    val apellido: String,
    val email: String,

    @SerializedName("id_rol")
    val roleId: Int,

    val estado: String,

    @SerializedName("fecha_registro")
    val registrationDate: String
)

data class ForgotPasswordRequest(
    val email: String
)

data class ResetPasswordRequest(
    val email: String,
    val codigo: String,
    @SerializedName("nuevaContraseña")
    val nuevaContrasena: String
)

data class MessageResponse(
    val mensaje: String
)

data class RegisterRequest(
    val nombre: String,
    val apellido: String,
    val email: String,
    val password: String
)

data class RegisterResponse(
    @SerializedName("id_usuario")
    val id: Int,

    val nombre: String,
    val apellido: String,
    val email: String,

    @SerializedName("id_rol")
    val roleId: Int,

    val estado: String,

    @SerializedName("fecha_registro")
    val registrationDate: String
)

interface AuthApi {

    @POST("auth/register")
    suspend fun register(
        @Body request: RegisterRequest
    ): RegisterResponse

    @POST("auth/login")
    suspend fun login(
        @Body request: LoginRequest
    ): LoginResponse

    @POST("auth/olvide-contrasena")
    suspend fun forgotPassword(
        @Body request: ForgotPasswordRequest
    ): MessageResponse

    @PATCH("auth/restablecer-contrasena")
    suspend fun resetPassword(
        @Body request: ResetPasswordRequest
    ): MessageResponse
}