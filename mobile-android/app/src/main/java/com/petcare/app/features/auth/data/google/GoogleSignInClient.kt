package com.petcare.app.features.auth.data.google

import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.petcare.app.R

/** Lo que puede pasar al pedirle a Google que elija una cuenta. */
sealed interface GoogleSignInResult {
    /** Token firmado por Google, listo para mandar al backend. */
    data class Exitoso(val idToken: String) : GoogleSignInResult

    /** La persona cerró el selector de cuentas: no es un error que haya que mostrar. */
    data object Cancelado : GoogleSignInResult

    data class Error(val mensaje: String) : GoogleSignInResult
}

/**
 * Pide el ID token de Google usando Credential Manager.
 *
 * El token NO se usa para confiar en el cliente: se manda al backend, que lo
 * valida contra Google antes de crear la sesión.
 */
class GoogleSignInClient(private val context: Context) {

    private val credentialManager = CredentialManager.create(context)

    suspend fun obtenerIdToken(): GoogleSignInResult {
        val clientId = context.getString(R.string.google_web_client_id)
        if (clientId.startsWith("PEGAR_CLIENT_ID")) {
            return GoogleSignInResult.Error(
                "Falta configurar el Client ID de Google en google.xml"
            )
        }

        /*
         * filterByAuthorizedAccounts = false para que también aparezcan cuentas
         * que todavía no usaron PetCare: si no, alguien que se registra por
         * primera vez no vería ninguna opción.
         */
        val googleIdOption = GetGoogleIdOption.Builder()
            .setFilterByAuthorizedAccounts(false)
            .setServerClientId(clientId)
            .build()

        val request = GetCredentialRequest.Builder()
            .addCredentialOption(googleIdOption)
            .build()

        return try {
            val response = credentialManager.getCredential(context, request)
            val credential = response.credential

            if (credential is CustomCredential &&
                credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
            ) {
                val googleCredential = GoogleIdTokenCredential.createFrom(credential.data)
                GoogleSignInResult.Exitoso(googleCredential.idToken)
            } else {
                GoogleSignInResult.Error("Google devolvio una credencial inesperada")
            }
        } catch (exception: GetCredentialCancellationException) {
            GoogleSignInResult.Cancelado
        } catch (exception: NoCredentialException) {
            GoogleSignInResult.Error(
                "No hay ninguna cuenta de Google configurada en el telefono"
            )
        } catch (exception: GetCredentialException) {
            GoogleSignInResult.Error("No se pudo conectar con Google")
        }
    }
}
