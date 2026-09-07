package com.petcare.app.features.profile.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import com.petcare.app.features.profile.domain.CODIGOS_PAIS
import com.petcare.app.features.profile.domain.CodigoPais
import com.petcare.app.features.profile.domain.ProfileValidationResult
import com.petcare.app.features.profile.domain.ProfileValidator
import com.petcare.app.features.profile.domain.separarTelefono
import com.petcare.app.features.profile.domain.unirTelefono

@Composable
fun EditProfileScreen(
    profile: UserProfileResponse,
    isSaving: Boolean,
    saveError: String?,
    onSave: (UpdateProfileRequest) -> Unit,
    onCancel: () -> Unit,
    onChangeEmail: () -> Unit
) {
    var nombre by rememberSaveable { mutableStateOf(profile.nombre) }
    var apellido by rememberSaveable { mutableStateOf(profile.apellido) }
    val (codigoInicial, numeroInicial) = remember(profile.telefono) {
        separarTelefono(profile.telefono)
    }
    var codigoPais by rememberSaveable { mutableStateOf(codigoInicial.codigo) }
    var numeroLocal by rememberSaveable { mutableStateOf(numeroInicial) }
    var validation by remember {
        mutableStateOf(ProfileValidationResult())
    }

    val paisElegido = CODIGOS_PAIS.first { it.codigo == codigoPais }
    val telefono = unirTelefono(paisElegido, numeroLocal)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .systemBarsPadding()
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
            value = profile.email,
            onValueChange = {},
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Correo electrónico") },
            readOnly = true,
            enabled = false,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            singleLine = true
        )

        TextButton(
            onClick = onChangeEmail,
            enabled = !isSaving,
            modifier = Modifier.padding(top = 4.dp)
        ) {
            Text("Cambiar email")
        }

        CampoTelefono(
            paisElegido = paisElegido,
            numeroLocal = numeroLocal,
            error = validation.telefonoError,
            enabled = !isSaving,
            onPaisElegido = { codigoPais = it.codigo },
            onNumeroChange = { numeroLocal = it.filter { caracter -> caracter.isDigit() } }
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
                    email = profile.email,
                    telefono = telefono
                )
                validation = nextValidation

                if (nextValidation.isValid) {
                    onSave(
                        UpdateProfileRequest(
                            nombre = nombre.trim(),
                            apellido = apellido.trim(),
                            email = profile.email,
                            telefono = telefono.trim()
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

@Composable
private fun CampoTelefono(
    paisElegido: CodigoPais,
    numeroLocal: String,
    error: String?,
    enabled: Boolean,
    onPaisElegido: (CodigoPais) -> Unit,
    onNumeroChange: (String) -> Unit
) {
    var menuAbierto by remember { mutableStateOf(false) }

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Box {
            OutlinedTextField(
                value = paisElegido.etiqueta,
                onValueChange = {},
                modifier = Modifier
                    .width(132.dp)
                    .clickable(enabled = enabled) { menuAbierto = true },
                label = { Text("País") },
                readOnly = true,
                enabled = false,
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    disabledTextColor = MaterialTheme.colorScheme.onSurface,
                    disabledLabelColor = MaterialTheme.colorScheme.onSurfaceVariant,
                    disabledBorderColor = MaterialTheme.colorScheme.outline
                )
            )
            DropdownMenu(
                expanded = menuAbierto,
                onDismissRequest = { menuAbierto = false }
            ) {
                CODIGOS_PAIS.forEach { pais ->
                    DropdownMenuItem(
                        text = { Text("${pais.bandera}  ${pais.pais}  ${pais.codigo}") },
                        onClick = {
                            menuAbierto = false
                            onPaisElegido(pais)
                        }
                    )
                }
            }
        }

        OutlinedTextField(
            value = numeroLocal,
            onValueChange = onNumeroChange,
            modifier = Modifier.weight(1f),
            label = { Text("Teléfono") },
            enabled = enabled,
            isError = error != null,
            supportingText = error?.let { { Text(it) } }
                ?: { Text("Sin el 0 ni el 15") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
            singleLine = true
        )
    }
}
