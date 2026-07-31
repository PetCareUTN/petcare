package com.petcare.app.features.pets.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.petcare.app.features.pets.data.remote.PetResponse
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.ui.theme.PetCareTealDark
import com.petcare.app.ui.theme.PetCareTealSoft

@Composable
fun PetProfileScreen(
    isLoading: Boolean,
    errorMessage: String?,
    pet: PetResponse?,
    onRetry: () -> Unit,
    onBack: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.Top,
        horizontalAlignment = Alignment.Start
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Perfil de la mascota",
                style = MaterialTheme.typography.headlineMedium
            )
            OutlinedButton(
                onClick = onBack,
                shape = MaterialTheme.shapes.large
            ) {
                Text("Volver")
            }
        }

        Spacer(modifier = Modifier.height(18.dp))

        when {
            isLoading -> {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    CircularProgressIndicator()
                }
            }

            errorMessage != null -> {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, PetCareLine),
                    shape = MaterialTheme.shapes.extraLarge
                ) {
                    Column(
                        modifier = Modifier.padding(18.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(
                            text = errorMessage,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodyMedium
                        )
                        OutlinedButton(
                            onClick = onRetry,
                            modifier = Modifier.fillMaxWidth(),
                            shape = MaterialTheme.shapes.large
                        ) {
                            Text("Reintentar")
                        }
                    }
                }
            }

            pet != null -> {
                PetProfileContent(pet = pet)
            }
        }
    }
}

@Composable
private fun PetProfileContent(pet: PetResponse) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Surface(
            modifier = Modifier.size(84.dp),
            shape = CircleShape,
            color = PetCareTealSoft
        ) {
            Column(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = pet.nombre.firstOrNull()?.uppercase() ?: "M",
                    color = PetCareTealDark,
                    style = MaterialTheme.typography.headlineMedium
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        Text(
            text = pet.nombre,
            style = MaterialTheme.typography.headlineMedium
        )
    }

    Spacer(modifier = Modifier.height(18.dp))

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, PetCareLine),
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            DetailRow(label = "Especie", value = pet.especie)
            DetailRow(label = "Raza", value = pet.raza ?: "Sin especificar")
            DetailRow(
                label = "Sexo",
                value = if (pet.sexo.equals("macho", ignoreCase = true)) "Macho" else "Hembra"
            )
            DetailRow(
                label = "Fecha de nacimiento",
                value = pet.birthDate ?: "Sin especificar"
            )
            DetailRow(
                label = "Peso",
                value = pet.peso?.let { "$it kg" } ?: "Sin especificar"
            )
            DetailRow(
                label = "Esterilizado",
                value = if (pet.esterilizado) "Si" else "No"
            )
            DetailRow(
                label = "Observaciones",
                value = pet.observaciones?.ifBlank { null } ?: "Sin observaciones registradas"
            )
        }
    }
}

@Composable
private fun DetailRow(label: String, value: String) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(
            text = label,
            color = PetCareMuted,
            style = MaterialTheme.typography.labelLarge
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyLarge
        )
    }
}
