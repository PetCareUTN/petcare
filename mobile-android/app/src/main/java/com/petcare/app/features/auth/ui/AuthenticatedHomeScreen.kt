package com.petcare.app.features.auth.ui

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
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.petcare.app.features.pets.data.remote.PetResponse
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMint
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.ui.theme.PetCareSurfaceSoft
import com.petcare.app.ui.theme.PetCareTeal
import com.petcare.app.ui.theme.PetCareTealDark
import com.petcare.app.ui.theme.PetCareTealSoft

@Composable
fun AuthenticatedHomeScreen(
    userName: String,
    pets: List<PetResponse>,
    isLoadingPets: Boolean,
    petsError: String?,
    onRetryPets: () -> Unit,
    onRegisterPet: () -> Unit,
    onLogout: () -> Unit
) {
    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        bottomBar = { PetCareBottomBar() }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .verticalScroll(rememberScrollState())
                .padding(innerPadding)
                .padding(horizontal = 20.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.Top,
            horizontalAlignment = Alignment.Start
        ) {
            HomeHeader(userName = userName, onLogout = onLogout)

            Spacer(modifier = Modifier.height(18.dp))

            ActivePetCard(
                pet = pets.firstOrNull(),
                onRegisterPet = onRegisterPet
            )

            Spacer(modifier = Modifier.height(18.dp))

            QuickActions()

            Spacer(modifier = Modifier.height(22.dp))

            SectionHeader(
                title = "Mis mascotas",
                action = "Registrar",
                onAction = onRegisterPet
            )

            Spacer(modifier = Modifier.height(12.dp))

            PetsContent(
                pets = pets,
                isLoadingPets = isLoadingPets,
                petsError = petsError,
                onRetryPets = onRetryPets,
                onRegisterPet = onRegisterPet
            )

            Spacer(modifier = Modifier.height(18.dp))
        }
    }
}

@Composable
private fun HomeHeader(
    userName: String,
    onLogout: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column {
            Text(
                text = "Hola,",
                color = PetCareMuted,
                style = MaterialTheme.typography.bodyLarge
            )
            Text(
                text = userName.ifBlank { "Tutor" },
                style = MaterialTheme.typography.headlineMedium
            )
        }
        OutlinedButton(
            onClick = onLogout,
            shape = MaterialTheme.shapes.large
        ) {
            Text("Salir")
        }
    }
}

@Composable
private fun ActivePetCard(
    pet: PetResponse?,
    onRegisterPet: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = PetCareTeal),
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = pet?.nombre ?: "Tu primera mascota",
                        color = Color.White,
                        style = MaterialTheme.typography.titleLarge
                    )
                    Text(
                        text = pet?.let { petSubtitle(it) } ?: "Registra una mascota para empezar",
                        color = Color.White.copy(alpha = 0.78f),
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
                Surface(
                    modifier = Modifier.size(54.dp),
                    shape = CircleShape,
                    color = Color.White.copy(alpha = 0.16f)
                ) {
                    Column(
                        modifier = Modifier.fillMaxSize(),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = pet?.nombre?.firstOrNull()?.uppercase() ?: "+",
                            color = Color.White,
                            style = MaterialTheme.typography.titleLarge
                        )
                    }
                }
            }

            Surface(
                color = Color.White.copy(alpha = 0.14f),
                shape = MaterialTheme.shapes.large
            ) {
                Text(
                    text = if (pet == null) {
                        "Alta rapida con datos basicos y foto opcional"
                    } else {
                        "Perfil activo listo para historia clinica y QR"
                    },
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                    color = Color.White,
                    style = MaterialTheme.typography.bodyMedium
                )
            }

            if (pet == null) {
                Button(
                    onClick = onRegisterPet,
                    modifier = Modifier.fillMaxWidth(),
                    shape = MaterialTheme.shapes.large
                ) {
                    Text("Registrar mascota")
                }
            }
        }
    }
}

@Composable
private fun QuickActions() {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(
            text = "Accesos rapidos",
            style = MaterialTheme.typography.titleMedium
        )
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            QuickAction(text = "Turno", modifier = Modifier.weight(1f))
            QuickAction(text = "Vacuna", modifier = Modifier.weight(1f))
            QuickAction(text = "QR", modifier = Modifier.weight(1f))
            QuickAction(text = "BLE", modifier = Modifier.weight(1f))
        }
    }
}

@Composable
private fun QuickAction(
    text: String,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier,
        color = PetCareMint,
        shape = MaterialTheme.shapes.large,
        border = BorderStroke(1.dp, PetCareLine)
    ) {
        Text(
            text = text,
            modifier = Modifier.padding(vertical = 12.dp),
            color = PetCareTealDark,
            style = MaterialTheme.typography.labelLarge
        )
    }
}

@Composable
private fun SectionHeader(
    title: String,
    action: String,
    onAction: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(text = title, style = MaterialTheme.typography.titleMedium)
        OutlinedButton(
            onClick = onAction,
            shape = MaterialTheme.shapes.large
        ) {
            Text(action)
        }
    }
}

@Composable
private fun PetsContent(
    pets: List<PetResponse>,
    isLoadingPets: Boolean,
    petsError: String?,
    onRetryPets: () -> Unit,
    onRegisterPet: () -> Unit
) {
    when {
        isLoadingPets -> {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                CircularProgressIndicator()
            }
        }

        petsError != null -> {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = PetCareSurfaceSoft),
                border = BorderStroke(1.dp, PetCareLine),
                shape = MaterialTheme.shapes.extraLarge
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(
                        text = petsError,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodyMedium
                    )
                    OutlinedButton(
                        onClick = onRetryPets,
                        modifier = Modifier.fillMaxWidth(),
                        shape = MaterialTheme.shapes.large
                    ) {
                        Text("Reintentar")
                    }
                }
            }
        }

        pets.isEmpty() -> {
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
                        text = "Todavia no tenes mascotas registradas",
                        style = MaterialTheme.typography.titleMedium
                    )
                    Text(
                        text = "Agrega sus datos basicos para empezar a construir su perfil.",
                        color = PetCareMuted,
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Button(
                        onClick = onRegisterPet,
                        modifier = Modifier.fillMaxWidth(),
                        shape = MaterialTheme.shapes.large
                    ) {
                        Text("Registrar mascota")
                    }
                }
            }
        }

        else -> {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                pets.forEach { pet ->
                    PetRow(pet = pet)
                }
            }
        }
    }
}

@Composable
private fun PetRow(pet: PetResponse) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, PetCareLine),
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape),
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
                        style = MaterialTheme.typography.titleMedium
                    )
                }
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = pet.nombre,
                    style = MaterialTheme.typography.titleMedium
                )
                Text(
                    text = petSubtitle(pet),
                    color = PetCareMuted,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
            Surface(
                color = PetCareMint,
                shape = MaterialTheme.shapes.large
            ) {
                Text(
                    text = pet.sexo.take(1).uppercase(),
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                    color = PetCareTealDark,
                    style = MaterialTheme.typography.labelLarge
                )
            }
        }
    }
}

@Composable
private fun PetCareBottomBar() {
    NavigationBar(
        containerColor = MaterialTheme.colorScheme.surface,
        tonalElevation = 0.dp
    ) {
        val items = listOf("Inicio", "Mascotas", "Servicios", "Adopcion", "Perfil")
        items.forEachIndexed { index, item ->
            NavigationBarItem(
                selected = index == 0,
                onClick = {},
                icon = {
                    Surface(
                        modifier = Modifier.size(8.dp),
                        shape = CircleShape,
                        color = if (index == 0) PetCareTeal else PetCareLine
                    ) {}
                },
                label = { Text(item) }
            )
        }
    }
}

private fun petSubtitle(pet: PetResponse): String =
    listOfNotNull(
        pet.raza,
        pet.especie,
        pet.peso?.let { "${it} kg" }
    ).joinToString(" - ")
