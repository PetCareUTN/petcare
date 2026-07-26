package com.petcare.app.features.auth.domain

import com.petcare.app.features.auth.data.local.AuthSession
import com.petcare.app.features.auth.data.local.SessionStore
import com.petcare.app.features.auth.data.remote.AuthApi
import com.petcare.app.features.auth.data.remote.LoginRequest

class AuthSessionController(
    private val authApi: AuthApi,
    private val sessionStore: SessionStore
) {

    fun restoreSession(): AuthSession? = sessionStore.getSession()

    fun logout() {
        sessionStore.clearSession()
    }

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
