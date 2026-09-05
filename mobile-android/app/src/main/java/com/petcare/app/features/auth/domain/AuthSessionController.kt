package com.petcare.app.features.auth.domain

import com.petcare.app.features.auth.data.local.AuthSession
import com.petcare.app.features.auth.data.local.SessionStore
import com.petcare.app.features.auth.data.remote.AuthApi
import com.petcare.app.features.auth.data.remote.GoogleLoginRequest
import com.petcare.app.features.auth.data.remote.GoogleLoginResponse
import com.petcare.app.features.auth.data.remote.GoogleRegisterRequest
import com.petcare.app.features.auth.data.remote.LoginRequest
import com.petcare.app.features.auth.data.remote.RegisterRequest
import com.petcare.app.features.auth.data.remote.RegisterResponse

/** Resultado del ingreso con Google desde el punto de vista de la app. */
sealed interface GoogleAuthResult {
    data class Ingreso(val session: AuthSession) : GoogleAuthResult

    data class FaltaCompletarRegistro(
        val idToken: String,
        val nombre: String,
        val apellido: String,
        val email: String
    ) : GoogleAuthResult
}

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
        numeroDocumento: String,
        email: String,
        password: String
    ): RegisterResponse =
        authApi.register(
            RegisterRequest(
                nombre = nombre,
                apellido = apellido,
                numeroDocumento = numeroDocumento,
                email = email,
                password = password
            )
        )

    /**
     * Paso 1 del ingreso con Google: si la cuenta ya existe queda la sesión
     * abierta y devuelve [GoogleAuthResult.Ingreso]; si es alguien nuevo
     * devuelve [GoogleAuthResult.FaltaCompletarRegistro] con los datos que dio
     * Google, para pedirle el DNI.
     */
    suspend fun ingresarConGoogle(idToken: String): GoogleAuthResult {
        val response = authApi.loginConGoogle(GoogleLoginRequest(idToken = idToken))

        return interpretarRespuestaGoogle(response, idToken)
    }

    /** Paso 2: crea la cuenta con el DNI que cargó la persona y abre sesión. */
    suspend fun registrarConGoogle(
        idToken: String,
        numeroDocumento: String
    ): GoogleAuthResult {
        val response = authApi.registrarConGoogle(
            GoogleRegisterRequest(
                idToken = idToken,
                numeroDocumento = numeroDocumento
            )
        )

        return interpretarRespuestaGoogle(response, idToken)
    }

    private fun interpretarRespuestaGoogle(
        response: GoogleLoginResponse,
        idToken: String
    ): GoogleAuthResult {
        if (response.requiereRegistro) {
            return GoogleAuthResult.FaltaCompletarRegistro(
                idToken = idToken,
                nombre = response.nombre.orEmpty(),
                apellido = response.apellido.orEmpty(),
                email = response.email.orEmpty()
            )
        }

        val token = response.token
        val usuario = response.usuario
        if (token == null || usuario == null) {
            throw IllegalStateException("El servidor no devolvio la sesion de Google")
        }

        val session = AuthSession(
            token = token,
            userName = usuario.nombre
        )
        sessionStore.saveSession(session)

        return GoogleAuthResult.Ingreso(session)
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
