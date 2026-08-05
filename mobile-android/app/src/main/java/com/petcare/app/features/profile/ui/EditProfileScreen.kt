package com.petcare.app.features.profile.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.petcare.app.features.profile.data.remote.UpdateProfileRequest
import com.petcare.app.features.profile.data.remote.UserProfileResponse
import com.petcare.app.features.profile.domain.ProfileValidationResult
import com.petcare.app.features.profile.domain.ProfileValidator

@Composable
fun EditProfileScreen(
    profile: UserProfileResponse,
    isSaving: Boolean,
    saveError: String?,
    onSave: (UpdateProfileRequest) -> Unit,
    onCancel: () -> Unit
) {
    var nombre by rememberSaveable { mutableStateOf(profile.nombre) }
    var apellido by rememberSaveable { mutableStateOf(profile.apellido) }
    var email by rememberSaveable { mutableStateOf(profile.email) }
    var telefono by rememberSaveable { mutableStateOf(profile.telefono ?: "") }
    var validation by remember {
        mutableStateOf(ProfileValidationResult())
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        verticalArrangement = Arrangement.Top,
        horizontalAlignment = Alignment.Start
    ) {
        Text(
            text = "Editar perfil",
            style = MaterialTheme.typography.headlineMedium
        )

        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
            value = nombre,
            onValueChange = { nombre = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Nombre") },
            isError = validation.nombreError != null,
            supportingText = validation.nombreError?.let { { Text(it) } },
            singleLine = true
        )

        OutlinedTextField(
            value = apellido,
            onValueChange = { apellido = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Apellido") },
            isError = validation.apellidoError != null,
            supportingText = validation.apellidoError?.let { { Text(it) } },
            singleLine = true
        )

        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Correo electrónico") },
            isError = validation.emailError != null,
            supportingText = validation.emailError?.let { { Text(it) } },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            singleLine = true
        )

        OutlinedTextField(
            value = telefono,
            onValueChange = { telefono = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Teléfono") },
            isError = validation.telefonoError != null,
            supportingText = validation.telefonoError?.let { { Text(it) } },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
            singleLine = true
        )

        saveError?.let {
            Text(
                text = it,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp),
                color = MaterialTheme.colorScheme.error
            )
        }

        Button(
            onClick = {
                val nextValidation = ProfileValidator.validate(
                    nombre = nombre,
                    apellido = apellido,
                    email = email,
                    telefono = telefono
                )
                validation = nextValidation

                if (nextValidation.isValid) {
                    onSave(
                        UpdateProfileRequest(
                            nombre = nombre.trim(),
                            apellido = apellido.trim(),
                            email = email.trim(),
                            telefono = telefono.trim().ifBlank { null }
                        )
                    )
                }
            },
            enabled = !isSaving,
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 16.dp)
        ) {
            Text(if (isSaving) "Guardando..." else "Guardar cambios")
        }

        OutlinedButton(
            onClick = onCancel,
            enabled = !isSaving,
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 8.dp)
        ) {
            Text("Cancelar")
        }
    }
}
