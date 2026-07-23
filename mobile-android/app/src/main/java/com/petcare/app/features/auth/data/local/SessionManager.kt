package com.petcare.app.features.auth.data.local

import android.content.Context
import android.content.SharedPreferences
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.GeneralSecurityException
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

data class AuthSession(
    val token: String,
    val userName: String
)

interface SessionStore {
    fun saveSession(session: AuthSession)
    fun getSession(): AuthSession?
    fun clearSession()
}

class SessionManager(
    context: Context
) : SessionStore {

    private val sharedPreferences: SharedPreferences =
        context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

    override fun saveSession(session: AuthSession) {
        val encryptedToken = encrypt(session.token)
        val encryptedUserName = encrypt(session.userName)

        sharedPreferences.edit()
            .putString(KEY_TOKEN_IV, encryptedToken.iv)
            .putString(KEY_TOKEN_VALUE, encryptedToken.value)
            .putString(KEY_USER_NAME_IV, encryptedUserName.iv)
            .putString(KEY_USER_NAME_VALUE, encryptedUserName.value)
            .apply()
    }

    override fun getSession(): AuthSession? {
        val tokenIv = sharedPreferences.getString(KEY_TOKEN_IV, null)
        val tokenValue = sharedPreferences.getString(KEY_TOKEN_VALUE, null)
        val userNameIv = sharedPreferences.getString(KEY_USER_NAME_IV, null)
        val userNameValue = sharedPreferences.getString(KEY_USER_NAME_VALUE, null)

        if (
            tokenIv == null ||
            tokenValue == null ||
            userNameIv == null ||
            userNameValue == null
        ) {
            return null
        }

        return try {
            val token = decrypt(EncryptedValue(tokenIv, tokenValue))
            val userName = decrypt(EncryptedValue(userNameIv, userNameValue))

            if (token.isBlank()) {
                null
            } else {
                AuthSession(token = token, userName = userName)
            }
        } catch (exception: GeneralSecurityException) {
            clearSession()
            null
        } catch (exception: IllegalArgumentException) {
            clearSession()
            null
        }
    }

    override fun clearSession() {
        sharedPreferences.edit()
            .remove(KEY_TOKEN_IV)
            .remove(KEY_TOKEN_VALUE)
            .remove(KEY_USER_NAME_IV)
            .remove(KEY_USER_NAME_VALUE)
            .apply()
    }

    private fun encrypt(value: String): EncryptedValue {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey())

        val encryptedBytes = cipher.doFinal(value.toByteArray(Charsets.UTF_8))

        return EncryptedValue(
            iv = Base64.encodeToString(cipher.iv, Base64.NO_WRAP),
            value = Base64.encodeToString(encryptedBytes, Base64.NO_WRAP)
        )
    }

    private fun decrypt(encryptedValue: EncryptedValue): String {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        val iv = Base64.decode(encryptedValue.iv, Base64.NO_WRAP)
        val encryptedBytes = Base64.decode(encryptedValue.value, Base64.NO_WRAP)

        cipher.init(
            Cipher.DECRYPT_MODE,
            getOrCreateKey(),
            GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv)
        )

        return String(cipher.doFinal(encryptedBytes), Charsets.UTF_8)
    }

    private fun getOrCreateKey(): SecretKey {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply {
            load(null)
        }

        keyStore.getKey(KEY_ALIAS, null)?.let { key ->
            return key as SecretKey
        }

        val keyGenerator = KeyGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_AES,
            ANDROID_KEYSTORE
        )
        val keySpec = KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setRandomizedEncryptionRequired(true)
            .build()

        keyGenerator.init(keySpec)
        return keyGenerator.generateKey()
    }

    private data class EncryptedValue(
        val iv: String,
        val value: String
    )

    private companion object {
        const val PREFERENCES_NAME = "petcare_auth_session"
        const val ANDROID_KEYSTORE = "AndroidKeyStore"
        const val KEY_ALIAS = "petcare_auth_session_key"
        const val TRANSFORMATION = "AES/GCM/NoPadding"
        const val GCM_TAG_LENGTH_BITS = 128
        const val KEY_TOKEN_IV = "token_iv"
        const val KEY_TOKEN_VALUE = "token_value"
        const val KEY_USER_NAME_IV = "user_name_iv"
        const val KEY_USER_NAME_VALUE = "user_name_value"
    }
}
