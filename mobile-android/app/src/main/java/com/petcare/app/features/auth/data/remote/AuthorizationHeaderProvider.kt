package com.petcare.app.features.auth.data.remote

import com.petcare.app.features.auth.data.local.SessionStore

class AuthorizationHeaderProvider(
    private val sessionStore: SessionStore
) {

    fun getAuthorizationHeader(): String? {
        val token = sessionStore.getSession()?.token

        return if (token.isNullOrBlank()) {
            null
        } else {
            "Bearer $token"
        }
    }
}
