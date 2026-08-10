package com.petcare.app.features.profile.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp

@Composable
fun ChangeEmailScreen(
    currentEmail: String,
    isCodeSent: Boolean,
    isLoading: Boolean = false,
    serverError: String? = null,
    successMessage: String? = null,
    onRequestCode: (nuevoEmail: String) -> Unit,
    onConfirmCode: (codigo: String) -> Unit,
    onCancel: () -> Unit
) {
    var nuevoEmail by rememberSaveable { mutableStateOf("") }
    var nuevoEmailError by rememberSaveable { mutableStateOf<String?>(null) }
    var codigo by rememberSaveable { mutableStateOf("") }
    var codigoError by rememberSaveable { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "Cambiar email",
            style = MaterialTheme.typography.headlineSmall
        )

        Text(
            text = if (isCodeSent) {
                "Ingresa el codigo que enviamos a $currentEmail para confirmar el cambio."
            } else {
                "Ingresa tu nuevo email. Te enviaremos un codigo de confirmacion a $currentEmail para verificar que sos vos."
            },
            modifier = Modifier.padding(top = 8.dp, bottom = 16.dp),
            style = MaterialTheme.typography.bodyMedium
        )

        serverError?.let {
            Text(
                text = it,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.padding(bottom = 12.dp)
            )
        }

        successMessage?.let {
            Text(
                text = it,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.padding(bottom = 12.dp)
            )
        }

        if (!isCodeSent) {
            OutlinedTextField(
                value = nuevoEmail,
                onValueChange = {
                    nuevoEmail = it
                    nuevoEmailError = null
                },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Nuevo email") },
                singleLine = true,
                enabled = !isLoading,
                isError = nuevoEmailError != null,
                supportingText = {
                    nuevoEmailError?.let { Text(it) }
                },
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Email,
                    imeAction = ImeAction.Done
                )
            )

            Button(
                onClick = {
                    nuevoEmailError = when {
                        nuevoEmail.isBlank() -> "El nuevo email es obligatorio"
                        !android.util.Patterns.EMAIL_ADDRESS.matcher(nuevoEmail).matches() ->
                            "Ingresa un email valido"
                        else -> null
                    }

                    if (nuevoEmailError == null) {
                        onRequestCode(nuevoEmail.trim())
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp),
                enabled = !isLoading
            ) {
                if (isLoading) {
                    CircularProgressIndicator()
                } else {
                    Text("Enviar codigo")
                }
            }
        } else {
            OutlinedTextField(
                value = codigo,
                onValueChange = {
                    codigo = it
                    codigoError = null
                },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Codigo de verificacion") },
                singleLine = true,
                enabled = !isLoading,
                isError = codigoError != null,
                supportingText = {
                    codigoError?.let { Text(it) }
                },
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Number,
                    imeAction = ImeAction.Done
                )
            )

            Button(
                onClick = {
                    codigoError = if (codigo.isBlank()) "El codigo es obligatorio" else null

                    if (codigoError == null) {
                        onConfirmCode(codigo.trim())
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp),
                enabled = !isLoading
            ) {
                if (isLoading) {
                    CircularProgressIndicator()
                } else {
                    Text("Confirmar cambio")
                }
            }
        }

        TextButton(
            onClick = onCancel,
            modifier = Modifier.padding(top = 16.dp),
            enabled = !isLoading
        ) {
            Text("Cancelar")
        }
    }
}
