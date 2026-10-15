package com.petcare.app.features.auth.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
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
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.ui.theme.PetCareTealSoft

/**
 * Último paso del alta con Google: Google no entrega el documento y el registro
 * de PetCare lo necesita, así que se pide acá antes de crear la cuenta.
 */
@Composable
fun CompletarRegistroGoogleScreen(
    nombre: String,
    email: String,
    isLoading: Boolean = false,
    serverError: String? = null,
    onConfirmar: (numeroDocumento: String) -> Unit,
    onCancelar: () -> Unit
) {
    var numeroDocumento by rememberSaveable { mutableStateOf("") }
    var documentoError by rememberSaveable { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .systemBarsPadding()
            .padding(24.dp),
        verticalArrangement = Arrangement.Top,
        horizontalAlignment = Alignment.Start
    ) {
        Text(
            text = "Completá tu registro",
            style = MaterialTheme.typography.headlineMedium
        )

        Text(
            text = "Hola $nombre, entrás con $email. Solo falta tu DNI para crear la cuenta.",
            color = PetCareMuted,
            style = MaterialTheme.typography.bodyLarge,
            modifier = Modifier.padding(top = 8.dp)
        )

        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 24.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surface
            ),
            border = BorderStroke(1.dp, PetCareLine),
            shape = MaterialTheme.shapes.extraLarge
        ) {
            Column(
                modifier = Modifier.padding(18.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedTextField(
                    value = numeroDocumento,
                    onValueChange = { nuevoValor ->
                        // Solo dígitos: el DNI se valida como 7 u 8 números.
                        numeroDocumento = nuevoValor.filter { it.isDigit() }.take(8)
                        documentoError = null
                    },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("DNI") },
                    singleLine = true,
                    enabled = !isLoading,
                    isError = documentoError != null,
                    supportingText = {
                        documentoError?.let { Text(it) }
                    },
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Number,
                        imeAction = ImeAction.Done
                    )
                )

                serverError?.let {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        color = PetCareTealSoft,
                        shape = MaterialTheme.shapes.medium
                    ) {
                        Text(
                            text = it,
                            color = MaterialTheme.colorScheme.error,
                            modifier = Modifier.padding(12.dp),
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }

                Button(
                    onClick = {
                        val documento = numeroDocumento.trim()
                        documentoError = when {
                            documento.isEmpty() -> "Ingresá tu DNI"
                            documento.length < 7 -> "El DNI debe tener 7 u 8 números"
                            else -> null
                        }

                        if (documentoError == null) {
                            onConfirmar(documento)
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    enabled = !isLoading,
                    shape = MaterialTheme.shapes.large
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(22.dp),
                            color = MaterialTheme.colorScheme.onPrimary
                        )
                    } else {
                        Text("Crear cuenta")
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        TextButton(onClick = onCancelar, enabled = !isLoading) {
            Text("Cancelar")
        }
    }
}
