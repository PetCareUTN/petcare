package com.petcare.app.features.auth.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.petcare.app.R
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
    onEditPet: (PetResponse) -> Unit,
    onLogout: () -> Unit,
    onPetClick: (PetResponse) -> Unit = {},
    onProfileClick: () -> Unit = {},
    onPublishAdoption: () -> Unit = {},
    onSettingsClick: () -> Unit = {},
    onServiciosClick: () -> Unit = {},
    onRequestTurno: () -> Unit = {},
    onViewMisTurnos: () -> Unit = {}
) {
    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        bottomBar = {
            PetCareBottomBar(
                onProfileClick = onProfileClick,
                onServiciosClick = onServiciosClick
            )
        }
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
            HomeHeader(
                userName = userName,
                onLogout = onLogout,
                onProfileClick = onProfileClick,
                onSettingsClick = onSettingsClick
            )

            Spacer(modifier = Modifier.height(18.dp))

            ActivePetCard(
                pet = pets.firstOrNull(),
                onRegisterPet = onRegisterPet
            )

            Spacer(modifier = Modifier.height(18.dp))

            Button(
                onClick = onPublishAdoption,
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 52.dp),
                shape = MaterialTheme.shapes.large
            ) {
                Text("Publicar mascota en adopción")
            }

            Spacer(modifier = Modifier.height(10.dp))

            OutlinedButton(
                onClick = onViewMisTurnos,
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 52.dp),
                shape = MaterialTheme.shapes.large
            ) {
                Text("Ver mis turnos")
            }

            Spacer(modifier = Modifier.height(18.dp))

            QuickActions(onRequestTurno = onRequestTurno)

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
                onRegisterPet = onRegisterPet,
                onEditPet = onEditPet,
                onPetClick = onPetClick
            )

            Spacer(modifier = Modifier.height(18.dp))
        }
    }
}

@Composable
private fun HomeHeader(
    userName: String,
    onLogout: () -> Unit,
    onProfileClick: () -> Unit,
    onSettingsClick: () -> Unit
) {
    var isMenuExpanded by remember { mutableStateOf(false) }
    val displayName = userName.ifBlank { "Tutor" }

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
                text = displayName,
                style = MaterialTheme.typography.headlineMedium
            )
        }
        Box {
            Surface(
                modifier = Modifier
                    .size(46.dp)
                    .clickable { isMenuExpanded = true },
                shape = CircleShape,
                color = PetCareTeal
            ) {
                Column(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = displayName.trim().take(1).uppercase(),
                        color = Color.White,
                        style = MaterialTheme.typography.titleMedium
                    )
                }
            }
            DropdownMenu(
                expanded = isMenuExpanded,
                onDismissRequest = { isMenuExpanded = false }
            ) {
                DropdownMenuItem(
                    text = { Text("Mi perfil") },
                    onClick = {
                        isMenuExpanded = false
                        onProfileClick()
                    }
                )
                DropdownMenuItem(
                    text = { Text("Configuración") },
                    onClick = {
                        isMenuExpanded = false
                        onSettingsClick()
                    }
                )
                DropdownMenuItem(
                    text = { Text("Cerrar sesión") },
                    onClick = {
                        isMenuExpanded = false
                        onLogout()
                    }
                )
            }
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
                        "Perfil activo listo para historia clínica y QR"
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
private fun QuickActions(onRequestTurno: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(
            text = "Accesos rápidos",
            style = MaterialTheme.typography.titleMedium
        )
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            QuickAction(text = "Turno", modifier = Modifier.weight(1f), onClick = onRequestTurno)
            QuickAction(text = "Vacuna", modifier = Modifier.weight(1f))
            QuickAction(text = "QR", modifier = Modifier.weight(1f))
            QuickAction(text = "BLE", modifier = Modifier.weight(1f))
        }
    }
}

@Composable
private fun QuickAction(
    text: String,
    modifier: Modifier = Modifier,
    onClick: () -> Unit = {}
) {
    Surface(
        modifier = modifier.clickable(onClick = onClick),
        color = PetCareMint,
        shape = MaterialTheme.shapes.large,
        border = BorderStroke(1.dp, PetCareLine)
    ) {
        Text(
            text = text,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 4.dp, vertical = 12.dp),
            color = PetCareTealDark,
            textAlign = TextAlign.Center,
            maxLines = 1,
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
    onRegisterPet: () -> Unit,
    onEditPet: (PetResponse) -> Unit,
    onPetClick: (PetResponse) -> Unit
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
                        text = "Todavía no tenés mascotas registradas",
                        style = MaterialTheme.typography.titleMedium
                    )
                    Text(
                        text = "Agregá sus datos básicos para empezar a construir su perfil.",
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
                    PetRow(
                        pet = pet,
                        onClick = { onPetClick(pet) },
                        onEdit = { onEditPet(pet) }
                    )
                }
            }
        }
    }
}

@Composable
private fun PetRow(pet: PetResponse, onClick: () -> Unit, onEdit: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
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
            TextButton(onClick = onEdit) {
                Text("Editar")
            }
        }
    }
}

@Composable
private fun PetCareBottomBar(
    onProfileClick: () -> Unit,
    onServiciosClick: () -> Unit
) {
    NavigationBar(
        containerColor = MaterialTheme.colorScheme.surface,
        tonalElevation = 0.dp
    ) {
        val items = listOf("Inicio", "Mascotas", "Servicios", "Adopción", "Perfil")
        items.forEachIndexed { index, item ->
            val isPerfil = item == "Perfil"
            val isServicios = item == "Servicios"
            NavigationBarItem(
                selected = index == 0,
                onClick = {
                    if (isPerfil) onProfileClick()
                    if (isServicios) onServiciosClick()
                },
                icon = {
                    val iconRes = when (item) {
                        "Mascotas" -> R.drawable.ic_paw
                        "Servicios" -> R.drawable.ic_services
                        "Adopción" -> R.drawable.ic_heart
                        "Perfil" -> R.drawable.ic_person
                        else -> R.drawable.ic_home
                    }
                    Icon(
                        painter = painterResource(iconRes),
                        contentDescription = item,
                        modifier = Modifier.size(22.dp)
                    )
                },
                label = {
                    Text(
                        text = item,
                        maxLines = 1,
                        softWrap = false,
                        fontSize = 10.sp,
                        style = MaterialTheme.typography.labelSmall
                    )
                }
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
