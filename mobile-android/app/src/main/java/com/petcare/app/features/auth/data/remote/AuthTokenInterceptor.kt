package com.petcare.app.features.auth.data.remote

import okhttp3.Interceptor
import okhttp3.Response

class AuthTokenInterceptor(
    private val authorizationHeaderProvider: AuthorizationHeaderProvider
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val authorizationHeader =
            authorizationHeaderProvider.getAuthorizationHeader()
        val request = if (authorizationHeader == null) {
            chain.request()
        } else {
            chain.request()
                .newBuilder()
                .header(AUTHORIZATION_HEADER, authorizationHeader)
                .build()
        }

        return chain.proceed(request)
    }

    private companion object {
        const val AUTHORIZATION_HEADER = "Authorization"
    }
}
