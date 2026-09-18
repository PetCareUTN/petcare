package com.petcare.app.features.profile.domain

import com.petcare.app.features.profile.data.remote.ConfirmEmailChangeRequest
import com.petcare.app.features.profile.data.remote.MessageResponse
import com.petcare.app.features.profile.data.remote.ProfileApi
import com.petcare.app.features.profile.data.remote.RequestEmailChangeRequest
import com.petcare.app.features.profile.data.remote.UpdatePreferenciasRequest
import com.petcare.app.features.profile.data.remote.UpdateProfileRequest
import com.petcare.app.features.profile.data.remote.UserProfileResponse

class ProfileController(
    private val profileApi: ProfileApi
) {

    suspend fun getMyProfile(): UserProfileResponse = profileApi.getMyProfile()

    suspend fun updateMyProfile(request: UpdateProfileRequest): UserProfileResponse =
        profileApi.updateMyProfile(request)

    suspend fun requestEmailChange(nuevoEmail: String): MessageResponse =
        profileApi.requestEmailChange(RequestEmailChangeRequest(nuevoEmail))

    /** Prende o apaga los recordatorios de vacunacion del usuario (US-40). */
    suspend fun setRecordatoriosVacunas(activos: Boolean): UserProfileResponse =
        profileApi.updatePreferencias(UpdatePreferenciasRequest(activos))

    suspend fun confirmEmailChange(codigo: String): MessageResponse =
        profileApi.confirmEmailChange(ConfirmEmailChangeRequest(codigo))
}
