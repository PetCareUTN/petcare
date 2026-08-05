package com.petcare.app.features.auth.domain

import com.petcare.app.features.auth.data.local.AuthSession
import com.petcare.app.features.auth.data.local.SessionStore
import com.petcare.app.features.auth.data.remote.AuthApi
import com.petcare.app.features.auth.data.remote.LoginRequest
import com.petcare.app.features.auth.data.remote.RegisterRequest
import com.petcare.app.features.auth.data.remote.RegisterResponse

class AuthSessionController(
    private val authApi: AuthApi,
    private val sessionStore: SessionStore
) {

    fun restoreSession(): AuthSession? = sessionStore.getSession()

    fun logout() {
        sessionStore.clearSession()
    }

    /**
     * El backend no devuelve un token al registrarse (POST /auth/register),
     * así que no se abre sesión automáticamente: el usuario debe iniciar
     * sesión luego de crear la cuenta.
     */
    suspend fun register(
        nombre: String,
        apellido: String,
        email: String,
        password: String
    ): RegisterResponse =
        authApi.register(
            RegisterRequest(
                nombre = nombre,
                apellido = apellido,
                email = email,
                password = password
            )
        )

    suspend fun login(email: String, password: String): AuthSession {
        val response = authApi.login(
            LoginRequest(
                email = email,
                password = password
            )
        )
        val session = AuthSession(
            token = response.token,
            userName = response.usuario.nombre
        )

        sessionStore.saveSession(session)

        return session
    }
}
