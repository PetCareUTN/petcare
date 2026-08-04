package com.petcare.app.features.profile.domain

import com.petcare.app.features.profile.data.remote.ProfileApi
import com.petcare.app.features.profile.data.remote.UpdateProfileRequest
import com.petcare.app.features.profile.data.remote.UserProfileResponse

class ProfileController(
    private val profileApi: ProfileApi
) {

    suspend fun getMyProfile(): UserProfileResponse = profileApi.getMyProfile()

    suspend fun updateMyProfile(request: UpdateProfileRequest): UserProfileResponse =
        profileApi.updateMyProfile(request)
}
