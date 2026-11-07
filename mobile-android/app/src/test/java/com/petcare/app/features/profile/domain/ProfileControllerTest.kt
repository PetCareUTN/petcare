package com.petcare.app.features.profile.domain

import com.petcare.app.features.profile.data.remote.ConfirmEmailChangeRequest
import com.petcare.app.features.profile.data.remote.GuardarZonaCasaRequest
import com.petcare.app.features.profile.data.remote.MessageResponse
import com.petcare.app.features.profile.data.remote.ProfileApi
import com.petcare.app.features.profile.data.remote.RequestEmailChangeRequest
import com.petcare.app.features.profile.data.remote.UpdatePreferenciasRequest
import com.petcare.app.features.profile.data.remote.UpdateProfileRequest
import com.petcare.app.features.profile.data.remote.UserProfileResponse
import com.petcare.app.features.profile.data.remote.ZonaCasaResponse
import kotlinx.coroutines.runBlocking
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
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

    @Test
    fun `updateMyPhoto sube la foto y devuelve el perfil con su ruta`() =
        runBlocking {
            val fakeProfileApi = FakeProfileApi()
            val controller = ProfileController(
                profileApi = fakeProfileApi
            )
            val foto = MultipartBody.Part.createFormData(
                name = "foto",
                filename = "yo.jpg",
                body = byteArrayOf(1, 2, 3).toRequestBody("image/jpeg".toMediaType())
            )

            val profile = controller.updateMyPhoto(foto)

            assertEquals(foto, fakeProfileApi.uploadedPhoto)
            assertEquals("/uploads/usuarios/usuario-1.jpg", profile.foto)
        }

    @Test
    fun `guardarZonaCasa manda el centro y el radio, y quitarZonaCasa la deja sin configurar`() =
        runBlocking {
            val fakeProfileApi = FakeProfileApi()
            val controller = ProfileController(fakeProfileApi)

            val guardada = controller.guardarZonaCasa(-31.42, -64.189, 200)
            assertEquals(true, guardada.configurada)
            assertEquals(200, guardada.radioMetros)

            val quitada = controller.quitarZonaCasa()
            assertEquals(false, quitada.configurada)
        }

    private class FakeProfileApi : ProfileApi {
        var updatedRequest: UpdateProfileRequest? = null
        var uploadedPhoto: MultipartBody.Part? = null

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

        override suspend fun updatePreferencias(
            request: UpdatePreferenciasRequest
        ): UserProfileResponse =
            getMyProfile().copy(recordatoriosVacunas = request.recordatoriosVacunas)

        override suspend fun updateMyPhoto(foto: MultipartBody.Part): UserProfileResponse {
            uploadedPhoto = foto
            return getMyProfile().copy(foto = "/uploads/usuarios/usuario-1.jpg")
        }

        override suspend fun requestEmailChange(request: RequestEmailChangeRequest): MessageResponse =
            throw UnsupportedOperationException("No usado en este test")

        override suspend fun confirmEmailChange(request: ConfirmEmailChangeRequest): MessageResponse =
            throw UnsupportedOperationException("No usado en este test")

        var zonaCasa = ZonaCasaResponse(
            configurada = false,
            latitud = null,
            longitud = null,
            radioMetros = null
        )

        override suspend fun getZonaCasa(): ZonaCasaResponse = zonaCasa

        override suspend fun guardarZonaCasa(request: GuardarZonaCasaRequest): ZonaCasaResponse {
            zonaCasa = ZonaCasaResponse(
                configurada = true,
                latitud = request.latitud,
                longitud = request.longitud,
                radioMetros = request.radioMetros
            )
            return zonaCasa
        }

        override suspend fun quitarZonaCasa(): ZonaCasaResponse {
            zonaCasa = ZonaCasaResponse(
                configurada = false,
                latitud = null,
                longitud = null,
                radioMetros = null
            )
            return zonaCasa
        }
    }
}
