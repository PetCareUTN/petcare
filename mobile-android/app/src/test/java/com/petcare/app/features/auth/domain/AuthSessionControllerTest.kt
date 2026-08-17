package com.petcare.app.features.auth.domain

import com.petcare.app.features.auth.data.local.AuthSession
import com.petcare.app.features.auth.data.local.SessionStore
import com.petcare.app.features.auth.data.remote.AuthApi
import com.petcare.app.features.auth.data.remote.ForgotPasswordRequest
import com.petcare.app.features.auth.data.remote.LoginRequest
import com.petcare.app.features.auth.data.remote.LoginResponse
import com.petcare.app.features.auth.data.remote.MessageResponse
import com.petcare.app.features.auth.data.remote.RegisterRequest
import com.petcare.app.features.auth.data.remote.RegisterResponse
import com.petcare.app.features.auth.data.remote.ResetPasswordRequest
import com.petcare.app.features.auth.data.remote.UserResponse
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class AuthSessionControllerTest {

    @Test
    fun `register exitoso devuelve el usuario creado y no abre sesion`() =
        runBlocking {
            val sessionStore = FakeSessionStore()
            val controller = AuthSessionController(
                authApi = FakeAuthApi(),
                sessionStore = sessionStore
            )

            val response = controller.register(
                nombre = "Sofia",
                apellido = "Muñoz",
                email = "sofia@petcare.com",
                password = "ClaveSegura123"
            )

            assertEquals("sofia@petcare.com", response.email)
            assertNull(sessionStore.savedSession)
        }

    @Test
    fun `login exitoso guarda la sesion y devuelve el usuario autenticado`() =
        runBlocking {
            val sessionStore = FakeSessionStore()
            val controller = AuthSessionController(
                authApi = FakeAuthApi(),
                sessionStore = sessionStore
            )

            val session = controller.login(
                email = "usuario@petcare.com",
                password = "ClaveSegura123"
            )

            assertEquals("jwt-token", session.token)
            assertEquals("Ignacio", session.userName)
            assertEquals(session, sessionStore.savedSession)
        }

    @Test
    fun `restoreSession devuelve null si no hay sesion guardada`() {
        val controller = AuthSessionController(
            authApi = FakeAuthApi(),
            sessionStore = FakeSessionStore()
        )

        assertNull(controller.restoreSession())
    }

    @Test
    fun `restoreSession devuelve la sesion guardada`() {
        val savedSession = AuthSession(
            token = "jwt-token",
            userName = "Ignacio"
        )
        val controller = AuthSessionController(
            authApi = FakeAuthApi(),
            sessionStore = FakeSessionStore(savedSession)
        )

        assertEquals(savedSession, controller.restoreSession())
    }

    @Test
    fun `logout elimina la sesion guardada`() {
        val sessionStore = FakeSessionStore(
            AuthSession(
                token = "jwt-token",
                userName = "Ignacio"
            )
        )
        val controller = AuthSessionController(
            authApi = FakeAuthApi(),
            sessionStore = sessionStore
        )

        controller.logout()

        assertNull(sessionStore.savedSession)
    }

    private class FakeAuthApi : AuthApi {
        override suspend fun register(request: RegisterRequest): RegisterResponse =
            RegisterResponse(
                id = 1,
                nombre = request.nombre,
                apellido = request.apellido,
                email = request.email,
                roleId = 1,
                estado = "ACTIVO",
                registrationDate = "2026-07-31"
            )

        override suspend fun login(request: LoginRequest): LoginResponse =
            LoginResponse(
                token = "jwt-token",
                usuario = UserResponse(
                    id = 1,
                    nombre = "Ignacio",
                    apellido = "Aldao",
                    email = request.email,
                    roleId = 2,
                    estado = "ACTIVO",
                    registrationDate = "2026-07-23"
                )
            )

        override suspend fun forgotPassword(request: ForgotPasswordRequest): MessageResponse =
            MessageResponse(mensaje = "Codigo enviado")

        override suspend fun resetPassword(request: ResetPasswordRequest): MessageResponse =
            MessageResponse(mensaje = "Contrasena actualizada")
    }

    private class FakeSessionStore(
        initialSession: AuthSession? = null
    ) : SessionStore {
        var savedSession: AuthSession? = initialSession

        override fun saveSession(session: AuthSession) {
            savedSession = session
        }

        override fun getSession(): AuthSession? = savedSession

        override fun clearSession() {
            savedSession = null
        }
    }
}
