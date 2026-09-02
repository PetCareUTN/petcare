package com.petcare.app.features.auth.domain

import com.petcare.app.features.auth.data.local.AuthSession
import com.petcare.app.features.auth.data.local.SessionStore
import com.petcare.app.features.auth.data.remote.AuthApi
import com.petcare.app.features.auth.data.remote.ForgotPasswordRequest
import com.petcare.app.features.auth.data.remote.GoogleLoginRequest
import com.petcare.app.features.auth.data.remote.GoogleLoginResponse
import com.petcare.app.features.auth.data.remote.GoogleRegisterRequest
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
import org.junit.Assert.assertTrue
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
                numeroDocumento = "30111222",
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

    @Test
    fun `ingresar con Google abre sesion cuando la cuenta ya existe`() =
        runBlocking {
            val sessionStore = FakeSessionStore()
            val controller = AuthSessionController(
                authApi = FakeAuthApi(),
                sessionStore = sessionStore
            )

            val resultado = controller.ingresarConGoogle("id-token-google")

            assertTrue(resultado is GoogleAuthResult.Ingreso)
            assertEquals("jwt-google", sessionStore.savedSession?.token)
            assertEquals("Laura", sessionStore.savedSession?.userName)
        }

    @Test
    fun `ingresar con Google pide completar el registro y no abre sesion`() =
        runBlocking {
            val sessionStore = FakeSessionStore()
            val controller = AuthSessionController(
                authApi = FakeAuthApi(
                    respuestaGoogle = GoogleLoginResponse(
                        requiereRegistro = true,
                        token = null,
                        usuario = null,
                        nombre = "Laura",
                        apellido = "Gomez",
                        email = "laura@gmail.com"
                    )
                ),
                sessionStore = sessionStore
            )

            val resultado = controller.ingresarConGoogle("id-token-google")

            assertTrue(resultado is GoogleAuthResult.FaltaCompletarRegistro)
            val pendiente = resultado as GoogleAuthResult.FaltaCompletarRegistro
            assertEquals("laura@gmail.com", pendiente.email)
            // El token se conserva para el segundo paso, donde se manda el DNI.
            assertEquals("id-token-google", pendiente.idToken)
            assertNull(sessionStore.savedSession)
        }

    @Test
    fun `registrar con Google abre sesion al completar el DNI`() =
        runBlocking {
            val sessionStore = FakeSessionStore()
            val controller = AuthSessionController(
                authApi = FakeAuthApi(),
                sessionStore = sessionStore
            )

            val resultado = controller.registrarConGoogle(
                idToken = "id-token-google",
                numeroDocumento = "30111222"
            )

            assertTrue(resultado is GoogleAuthResult.Ingreso)
            assertEquals("jwt-google", sessionStore.savedSession?.token)
        }

    private class FakeAuthApi(
        /** Respuesta que devuelven los endpoints de Google en cada test. */
        private val respuestaGoogle: GoogleLoginResponse = GoogleLoginResponse(
            requiereRegistro = false,
            token = "jwt-google",
            usuario = UserResponse(
                id = 3,
                nombre = "Laura",
                apellido = "Gomez",
                email = "laura@gmail.com",
                roleId = 2,
                estado = "ACTIVO",
                registrationDate = "2026-09-01"
            ),
            nombre = null,
            apellido = null,
            email = null
        )
    ) : AuthApi {
        override suspend fun loginConGoogle(
            request: GoogleLoginRequest
        ): GoogleLoginResponse = respuestaGoogle

        override suspend fun registrarConGoogle(
            request: GoogleRegisterRequest
        ): GoogleLoginResponse = respuestaGoogle

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
