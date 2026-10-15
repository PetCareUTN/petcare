package com.petcare.app.features.auth.data.remote

import com.petcare.app.features.auth.data.local.AuthSession
import com.petcare.app.features.auth.data.local.SessionStore
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class AuthorizationHeaderProviderTest {

    @Test
    fun `devuelve null si no hay sesion`() {
        val provider = AuthorizationHeaderProvider(
            FakeSessionStore(session = null)
        )

        assertNull(provider.getAuthorizationHeader())
    }

    @Test
    fun `devuelve null si el token esta vacio`() {
        val provider = AuthorizationHeaderProvider(
            FakeSessionStore(
                AuthSession(
                    token = " ",
                    userName = "Ignacio"
                )
            )
        )

        assertNull(provider.getAuthorizationHeader())
    }

    @Test
    fun `devuelve header bearer si hay token guardado`() {
        val provider = AuthorizationHeaderProvider(
            FakeSessionStore(
                AuthSession(
                    token = "jwt-token",
                    userName = "Ignacio"
                )
            )
        )

        assertEquals(
            "Bearer jwt-token",
            provider.getAuthorizationHeader()
        )
    }

    private class FakeSessionStore(
        private val session: AuthSession?
    ) : SessionStore {

        override fun saveSession(session: AuthSession) = Unit

        override fun getSession(): AuthSession? = session

        override fun clearSession() = Unit
    }
}
