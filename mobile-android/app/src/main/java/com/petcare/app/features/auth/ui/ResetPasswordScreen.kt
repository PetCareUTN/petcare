package com.petcare.app.features.auth.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.systemBarsPadding
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
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp

@Composable
fun ResetPasswordScreen(
    email: String,
    isLoading: Boolean = false,
    serverError: String? = null,
    successMessage: String? = null,
    onResetPassword: (codigo: String, nuevaContrasena: String) -> Unit,
    onNavigateToLogin: () -> Unit
) {
    var codigo by rememberSaveable { mutableStateOf("") }
    var nuevaContrasena by rememberSaveable { mutableStateOf("") }
    var confirmarContrasena by rememberSaveable { mutableStateOf("") }
    var codigoError by rememberSaveable { mutableStateOf<String?>(null) }
    var nuevaContrasenaError by rememberSaveable { mutableStateOf<String?>(null) }
    var confirmarContrasenaError by rememberSaveable { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .systemBarsPadding()
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "PetCare",
            style = MaterialTheme.typography.headlineLarge
        )

        Text(
            text = "Definir nueva contrasena",
            modifier = Modifier.padding(top = 8.dp, bottom = 24.dp),
            style = MaterialTheme.typography.headlineSmall
        )

        Text(
            text = "Ingresa el codigo que recibiste en $email y tu nueva contrasena.",
            modifier = Modifier.padding(bottom = 16.dp),
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

        OutlinedTextField(
            value = codigo,
            onValueChange = {
                codigo = it.take(250)
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
                imeAction = ImeAction.Next
            )
        )

        OutlinedTextField(
            value = nuevaContrasena,
            onValueChange = {
                nuevaContrasena = it.take(250)
                nuevaContrasenaError = null
            },
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 8.dp),
            label = { Text("Nueva contrasena") },
            singleLine = true,
            enabled = !isLoading,
            isError = nuevaContrasenaError != null,
            supportingText = {
                nuevaContrasenaError?.let { Text(it) }
            },
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Password,
                imeAction = ImeAction.Next
            )
        )

        OutlinedTextField(
            value = confirmarContrasena,
            onValueChange = {
                confirmarContrasena = it.take(250)
                confirmarContrasenaError = null
            },
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 8.dp),
            label = { Text("Confirmar contrasena") },
            singleLine = true,
            enabled = !isLoading,
            isError = confirmarContrasenaError != null,
            supportingText = {
                confirmarContrasenaError?.let { Text(it) }
            },
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Password,
                imeAction = ImeAction.Done
            )
        )

        Button(
            onClick = {
                codigoError = if (codigo.isBlank()) "El codigo es obligatorio" else null
                nuevaContrasenaError = when {
                    nuevaContrasena.isBlank() -> "La contrasena es obligatoria"
                    nuevaContrasena.length < 8 -> "La contrasena debe tener al menos 8 caracteres"
                    else -> null
                }
                confirmarContrasenaError = when {
                    confirmarContrasena.isBlank() -> "Confirma tu contrasena"
                    confirmarContrasena != nuevaContrasena -> "Las contrasenas no coinciden"
                    else -> null
                }

                if (codigoError == null && nuevaContrasenaError == null && confirmarContrasenaError == null) {
                    onResetPassword(codigo.trim(), nuevaContrasena)
                }
            },
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 24.dp),
            enabled = !isLoading
        ) {
            if (isLoading) {
                CircularProgressIndicator()
            } else {
                Text("Definir contrasena")
            }
        }

        TextButton(
            onClick = onNavigateToLogin,
            modifier = Modifier.padding(top = 16.dp)
        ) {
            Text("Volver al inicio de sesion")
        }
    }
}
