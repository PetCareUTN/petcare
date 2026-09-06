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
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
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
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.petcare.app.R
import com.petcare.app.features.pets.data.remote.PetResponse
import com.petcare.app.features.pets.ui.PetAvatar
import com.petcare.app.features.turnos.domain.TipoTurnoItem
import com.petcare.app.features.turnos.domain.TurnoUnificado
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMint
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.ui.theme.PetCareSurfaceSoft
import com.petcare.app.ui.theme.PetCareTeal
import com.petcare.app.ui.theme.PetCareTealDark
import com.petcare.app.ui.theme.PetCareTealSoft
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

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
    onSettingsClick: () -> Unit = {},
    turnos: List<TurnoUnificado> = emptyList(),
    isLoadingTurnos: Boolean = false,
    onLoadTurnos: () -> Unit = {},
    onVerTurnos: () -> Unit = {}
) {
    LaunchedEffect(Unit) {
        onLoadTurnos()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState())
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

        Spacer(modifier = Modifier.height(22.dp))

        SectionHeader(title = "Mis mascotas")

        Spacer(modifier = Modifier.height(12.dp))

        PetsCarousel(
            pets = pets,
            isLoadingPets = isLoadingPets,
            petsError = petsError,
            onRetryPets = onRetryPets,
            onRegisterPet = onRegisterPet,
            onEditPet = onEditPet,
            onPetClick = onPetClick
        )

        Spacer(modifier = Modifier.height(26.dp))

        SectionHeader(
            title = "Próximos turnos",
            action = if (turnos.isNotEmpty()) "Ver todos" else null,
            onAction = onVerTurnos
        )

        Spacer(modifier = Modifier.height(12.dp))

        ProximosTurnosContent(
            turnos = turnos,
            isLoading = isLoadingTurnos,
            onTurnoClick = onVerTurnos
        )

        Spacer(modifier = Modifier.height(18.dp))
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
        Row(
            modifier = Modifier.weight(1f),
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
private fun SectionHeader(
    title: String,
    action: String? = null,
    onAction: () -> Unit = {}
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(text = title, style = MaterialTheme.typography.titleMedium)
        if (action == null) return@Row
        OutlinedButton(
            onClick = onAction,
            shape = MaterialTheme.shapes.large
        ) {
            Text(action)
        }
    }
}

@Composable
private fun PetsCarousel(
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
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(14.dp),
                contentPadding = PaddingValues(end = 6.dp)
            ) {
                items(pets, key = { it.id }) { pet ->
                    PetCarouselCard(
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
private fun PetCarouselCard(pet: PetResponse, onClick: () -> Unit, onEdit: () -> Unit) {
    Box(
        modifier = Modifier
            .width(168.dp)
            .heightIn(min = 192.dp)
            .clip(MaterialTheme.shapes.extraLarge)
            .background(Brush.verticalGradient(listOf(PetCareTeal, PetCareTealDark)))
            .clickable(onClick = onClick)
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top
        ) {
            PetAvatar(
                petName = pet.nombre,
                photoPath = pet.foto,
                modifier = Modifier.size(56.dp)
            )
            Surface(
                color = Color.White.copy(alpha = 0.22f),
                shape = MaterialTheme.shapes.large
            ) {
                Text(
                    text = "Activo",
                    color = Color.White,
                    style = MaterialTheme.typography.labelSmall,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                )
            }
        }

        IconButton(
            onClick = onEdit,
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(top = 34.dp)
                .size(26.dp)
        ) {
            Icon(
                painter = painterResource(R.drawable.ic_edit),
                contentDescription = "Editar ${pet.nombre}",
                tint = Color.White.copy(alpha = 0.85f),
                modifier = Modifier.size(15.dp)
            )
        }

        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .fillMaxWidth()
        ) {
            Text(
                text = pet.nombre,
                color = Color.White,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                style = MaterialTheme.typography.titleLarge
            )
            Text(
                text = petCarouselSubtitle(pet),
                color = Color.White.copy(alpha = 0.85f),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}

@Composable
private fun ProximosTurnosContent(
    turnos: List<TurnoUnificado>,
    isLoading: Boolean,
    onTurnoClick: () -> Unit
) {
    val proximos = remember(turnos) {
        val hoy = hoyIso()
        turnos
            .filter { it.estado == "confirmado" && it.fecha >= hoy }
            .sortedWith(compareBy({ it.fecha }, { it.horaInicio }))
            .take(4)
    }

    when {
        isLoading && turnos.isEmpty() -> {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                CircularProgressIndicator()
            }
        }

        proximos.isEmpty() -> {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = BorderStroke(1.dp, PetCareLine),
                shape = MaterialTheme.shapes.extraLarge
            ) {
                Text(
                    text = "No tenés turnos próximos agendados",
                    color = PetCareMuted,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(16.dp)
                )
            }
        }

        else -> {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                proximos.forEach { turno ->
                    ProximoTurnoCard(turno = turno, onClick = onTurnoClick)
                }
            }
        }
    }
}

@Composable
private fun ProximoTurnoCard(turno: TurnoUnificado, onClick: () -> Unit) {
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
                modifier = Modifier.size(48.dp),
                shape = CircleShape,
                color = PetCareTealSoft
            ) {
                Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                    Icon(
                        painter = painterResource(iconoTipoTurno(turno.tipo)),
                        contentDescription = null,
                        tint = PetCareTealDark,
                        modifier = Modifier.size(22.dp)
                    )
                }
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = turno.contraparteNombre,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    style = MaterialTheme.typography.titleMedium
                )
                Text(
                    text = "Para ${turno.nombreMascota}",
                    color = PetCareMuted,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    style = MaterialTheme.typography.bodySmall
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Surface(
                    color = PetCareTeal,
                    shape = MaterialTheme.shapes.large
                ) {
                    Text(
                        text = "${etiquetaFechaRelativa(turno.fecha)} ${formatHoraCorta(turno.horaInicio)}",
                        color = Color.White,
                        style = MaterialTheme.typography.labelMedium,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Confirmado",
                    color = PetCareTealDark,
                    style = MaterialTheme.typography.labelSmall
                )
            }
        }
    }
}

private fun iconoTipoTurno(tipo: TipoTurnoItem): Int = when (tipo) {
    TipoTurnoItem.VETERINARIA -> R.drawable.ic_paw
    TipoTurnoItem.PASEADOR, TipoTurnoItem.GUARDERIA, TipoTurnoItem.PELUQUERIA -> R.drawable.ic_services
}

@Composable
fun PetCareBottomBar(
    selectedItem: String,
    onInicioClick: () -> Unit = {},
    onServiciosClick: () -> Unit,
    onTurnosClick: () -> Unit,
    onAdopcionClick: () -> Unit
) {
    NavigationBar(
        containerColor = MaterialTheme.colorScheme.surface,
        tonalElevation = 0.dp
    ) {
        val items = listOf("Inicio", "Mascotas", "Servicios", "Adopción", "Turnos", "Localización")
        items.forEach { item ->
            val isInicio = item == "Inicio"
            val isTurnos = item == "Turnos"
            val isServicios = item == "Servicios"
            val isAdopcion = item == "Adopción"
            // La localizacion se agrega para el sprint que viene (BLE); por ahora no hace nada.
            NavigationBarItem(
                selected = item == selectedItem,
                onClick = {
                    if (isInicio) onInicioClick()
                    if (isTurnos) onTurnosClick()
                    if (isServicios) onServiciosClick()
                    if (isAdopcion) onAdopcionClick()
                },
                icon = {
                    val iconRes = when (item) {
                        "Mascotas" -> R.drawable.ic_paw
                        "Servicios" -> R.drawable.ic_services
                        "Adopción" -> R.drawable.ic_heart
                        "Turnos" -> R.drawable.ic_calendar
                        "Localización" -> R.drawable.ic_location
                        else -> R.drawable.ic_home
                    }
                    Icon(
                        painter = painterResource(iconRes),
                        contentDescription = item,
                        modifier = Modifier.size(20.dp)
                    )
                },
                label = {
                    Text(
                        text = item,
                        maxLines = 1,
                        softWrap = false,
                        fontSize = 9.sp,
                        style = MaterialTheme.typography.labelSmall
                    )
                }
            )
        }
    }
}

private fun petCarouselSubtitle(pet: PetResponse): String =
    listOfNotNull(
        pet.raza?.takeIf { it.isNotBlank() && !it.equals("Sin raza", ignoreCase = true) }
            ?: pet.especie,
        pet.sexo.take(1).uppercase(),
        calcularEdadTexto(pet.birthDate)
    ).joinToString(" · ")

/** Calcula la edad a partir de "yyyy-MM-dd", ej. "3 años" o "Cachorro" si tiene menos de 1. */
private fun calcularEdadTexto(birthDate: String?): String? {
    val partes = birthDate?.split("-") ?: return null
    if (partes.size != 3) return null
    val anioNac = partes[0].toIntOrNull() ?: return null
    val mesNac = partes[1].toIntOrNull() ?: return null
    val diaNac = partes[2].toIntOrNull() ?: return null

    val hoy = Calendar.getInstance()
    var edad = hoy.get(Calendar.YEAR) - anioNac
    val mesHoy = hoy.get(Calendar.MONTH) + 1
    val diaHoy = hoy.get(Calendar.DAY_OF_MONTH)
    if (mesHoy < mesNac || (mesHoy == mesNac && diaHoy < diaNac)) {
        edad -= 1
    }

    return when {
        edad < 0 -> null
        edad == 0 -> "Cachorro"
        edad == 1 -> "1 año"
        else -> "$edad años"
    }
}

/** "10:00:00" -> "10:00" */
private fun formatHoraCorta(hora: String): String = hora.split(":").take(2).joinToString(":")

private fun isoFormatter(): SimpleDateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)

private fun hoyIso(): String = isoFormatter().format(Date())

/** "Hoy", "Mañana" o "dd/MM" segun que tan lejos este la fecha. */
private fun etiquetaFechaRelativa(fecha: String): String {
    val hoy = Calendar.getInstance()
    val manana = Calendar.getInstance().apply { add(Calendar.DAY_OF_YEAR, 1) }
    return when (fecha) {
        isoFormatter().format(hoy.time) -> "Hoy"
        isoFormatter().format(manana.time) -> "Mañana"
        else -> {
            val partes = fecha.split("-")
            if (partes.size == 3) "${partes[2]}/${partes[1]}" else fecha
        }
    }
}
