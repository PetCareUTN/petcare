package com.petcare.app.features.profile.domain

import com.petcare.app.features.profile.data.remote.ConfirmEmailChangeRequest
import com.petcare.app.features.profile.data.remote.MessageResponse
import com.petcare.app.features.profile.data.remote.ProfileApi
import com.petcare.app.features.profile.data.remote.RequestEmailChangeRequest
import com.petcare.app.features.profile.data.remote.UpdateProfileRequest
import com.petcare.app.features.profile.data.remote.UserProfileResponse
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Test

class ProfileControllerTest {

    @Test
    fun `getMyProfile devuelve el perfil del usuario autenticado`() =
        runBlocking {
            val controller = ProfileController(
                profileApi = FakeProfileApi()
            )

            val profile = controller.getMyProfile()

            assertEquals("Ana", profile.nombre)
            assertEquals("Perez", profile.apellido)
            assertEquals("ana.perez@example.com", profile.email)
        }

    @Test
    fun `updateMyProfile actualiza el perfil y devuelve la respuesta del backend`() =
        runBlocking {
            val fakeProfileApi = FakeProfileApi()
            val controller = ProfileController(
                profileApi = fakeProfileApi
            )
            val request = UpdateProfileRequest(
                nombre = "Ana",
                apellido = "Gomez",
                email = "ana.gomez@example.com",
                telefono = "+54 11 4444-4444"
            )

            val profile = controller.updateMyProfile(request)

            assertEquals(request, fakeProfileApi.updatedRequest)
            assertEquals("Gomez", profile.apellido)
            assertEquals("ana.gomez@example.com", profile.email)
            assertEquals("+54 11 4444-4444", profile.telefono)
        }

    private class FakeProfileApi : ProfileApi {
        var updatedRequest: UpdateProfileRequest? = null

        override suspend fun getMyProfile(): UserProfileResponse =
            UserProfileResponse(
                id = 1,
                nombre = "Ana",
                apellido = "Perez",
                email = "ana.perez@example.com",
                telefono = "+54 11 5555-5555",
                roleId = 2,
                estado = "activo",
                registrationDate = "2024-01-01"
            )

        override suspend fun updateMyProfile(request: UpdateProfileRequest): UserProfileResponse {
            updatedRequest = request
            val current = getMyProfile()
            return current.copy(
                nombre = request.nombre ?: current.nombre,
                apellido = request.apellido ?: current.apellido,
                email = request.email ?: current.email,
                telefono = request.telefono ?: current.telefono
            )
        }

        override suspend fun requestEmailChange(request: RequestEmailChangeRequest): MessageResponse =
            throw UnsupportedOperationException("No usado en este test")

        override suspend fun confirmEmailChange(request: ConfirmEmailChangeRequest): MessageResponse =
            throw UnsupportedOperationException("No usado en este test")
    }
}
