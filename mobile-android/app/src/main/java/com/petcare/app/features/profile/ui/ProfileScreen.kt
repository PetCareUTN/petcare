package com.petcare.app.features.profile.ui

import com.petcare.app.ui.components.elevacionTarjeta
import com.petcare.app.ui.components.elevacionBotonContorno
import android.net.Uri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import com.petcare.app.features.pets.ui.PetAvatar
import com.petcare.app.features.pets.ui.rememberAdjustedPhotoPicker
import com.petcare.app.features.profile.data.remote.UserProfileResponse
import com.petcare.app.R
import com.petcare.app.ui.theme.PetCareError
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.ui.theme.PetCareTeal
import com.petcare.app.ui.theme.PetCareTealDark
import com.petcare.app.ui.theme.PetCareTealSoft

@Composable
fun ProfileScreen(
    isLoading: Boolean,
    errorMessage: String?,
    profile: UserProfileResponse?,
    onRetry: () -> Unit,
    onEdit: () -> Unit,
    onConfiguracion: () -> Unit,
    onLogout: () -> Unit,
    isUploadingPhoto: Boolean = false,
    photoError: String? = null,
    onPhotoSelected: (Uri) -> Unit = {},
    // Null cuando la pantalla se abre como pestaña: ahí no hay a dónde volver.
    onBack: (() -> Unit)? = null
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .systemBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.Top,
        horizontalAlignment = Alignment.Start
    ) {
        if (onBack != null) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onBack) {
                    Icon(
                        painter = painterResource(R.drawable.ic_arrow_back),
                        contentDescription = "Volver",
                        tint = PetCareTealDark
                    )
                }
                Text(
                    text = "Mi perfil",
                    modifier = Modifier.weight(1f),
                    style = MaterialTheme.typography.headlineSmall
                )
            }

            Spacer(modifier = Modifier.height(18.dp))
        } else {
            // Como pestaña la cabecera de color ya hace de título.
            Spacer(modifier = Modifier.height(12.dp))
        }

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
                    elevation = elevacionTarjeta(),
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
                            elevation = elevacionBotonContorno(),
                            colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(containerColor = androidx.compose.material3.MaterialTheme.colorScheme.surface),
                            onClick = onRetry,
                            modifier = Modifier.fillMaxWidth(),
                            shape = MaterialTheme.shapes.large
                        ) {
                            Text("Reintentar")
                        }
                    }
                }
            }

            profile != null -> {
                ProfileContent(
                    profile = profile,
                    isUploadingPhoto = isUploadingPhoto,
                    photoError = photoError,
                    onPhotoSelected = onPhotoSelected,
                    onEdit = onEdit
                )
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        Text(
            text = "Cuenta",
            modifier = Modifier.padding(start = 4.dp),
            style = MaterialTheme.typography.titleMedium
        )

        Spacer(modifier = Modifier.height(10.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            elevation = elevacionTarjeta(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = BorderStroke(1.dp, PetCareLine),
            shape = MaterialTheme.shapes.extraLarge
        ) {
            Column(modifier = Modifier.padding(vertical = 6.dp)) {
                AccesoPerfil(
                    texto = "Configuración",
                    iconRes = R.drawable.ic_settings,
                    onClick = onConfiguracion
                )
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        OutlinedButton(
            elevation = elevacionBotonContorno(),
            colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(containerColor = androidx.compose.material3.MaterialTheme.colorScheme.surface),
            onClick = onLogout,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            shape = MaterialTheme.shapes.large,
            border = BorderStroke(1.dp, PetCareError)
        ) {
            Text("Cerrar sesión", color = PetCareError)
        }

        Spacer(modifier = Modifier.height(18.dp))
    }
}

@Composable
private fun AccesoPerfil(texto: String, iconRes: Int, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 18.dp, vertical = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Icon(
            painter = painterResource(iconRes),
            contentDescription = null,
            tint = PetCareTealDark,
            modifier = Modifier.size(22.dp)
        )
        Text(
            text = texto,
            modifier = Modifier.weight(1f),
            style = MaterialTheme.typography.bodyLarge
        )
        Icon(
            painter = painterResource(R.drawable.ic_chevron_right),
            contentDescription = null,
            tint = PetCareMuted,
            modifier = Modifier.size(22.dp)
        )
    }
}

@Composable
private fun ProfileContent(
    profile: UserProfileResponse,
    isUploadingPhoto: Boolean,
    photoError: String?,
    onPhotoSelected: (Uri) -> Unit,
    onEdit: () -> Unit
) {
    // Sale del modelo porque apellido puede venir en null (cuentas de Google):
    // armarlo aca con isNotBlank() sobre el apellido rompia la pantalla.
    val nombreCompleto = profile.nombreCompleto
    val elegirFoto = rememberAdjustedPhotoPicker(onPhotoAdjusted = onPhotoSelected)

    // Cabecera: franja de color, avatar (con la foto si la cargó) apoyado en el
    // borde y los datos principales de la persona.
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = elevacionTarjeta(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, PetCareLine),
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Box(modifier = Modifier.fillMaxWidth()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(104.dp)
                    .background(
                        Brush.linearGradient(listOf(PetCareTealDark, PetCareTeal))
                    )
            )

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 56.dp, start = 20.dp, end = 20.dp, bottom = 20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Box(contentAlignment = Alignment.Center) {
                    // PetAvatar sirve igual para personas: inicial de fondo y la foto encima.
                    PetAvatar(
                        petName = profile.nombre.ifBlank { "U" },
                        photoPath = profile.foto,
                        modifier = Modifier
                            .size(96.dp)
                            .border(4.dp, MaterialTheme.colorScheme.surface, CircleShape)
                            .clickable(enabled = !isUploadingPhoto, onClick = elegirFoto),
                        textStyle = MaterialTheme.typography.headlineMedium
                    )
                    if (isUploadingPhoto) {
                        CircularProgressIndicator(modifier = Modifier.size(96.dp))
                    }
                }

                TextButton(onClick = elegirFoto, enabled = !isUploadingPhoto) {
                    Text(
                        text = if (profile.foto.isNullOrBlank()) "Agregar foto" else "Cambiar foto",
                        color = PetCareTealDark
                    )
                }

                photoError?.let { mensaje ->
                    Text(
                        text = mensaje,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = nombreCompleto,
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = profile.email,
                    color = PetCareMuted,
                    style = MaterialTheme.typography.bodyMedium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                Spacer(modifier = Modifier.height(16.dp))

                OutlinedButton(
                    elevation = elevacionBotonContorno(),
                    colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(containerColor = androidx.compose.material3.MaterialTheme.colorScheme.surface),
                    onClick = onEdit,
                    modifier = Modifier.height(44.dp),
                    shape = MaterialTheme.shapes.large,
                    border = BorderStroke(1.dp, PetCareTeal)
                ) {
                    Icon(
                        painter = painterResource(R.drawable.ic_edit),
                        contentDescription = null,
                        tint = PetCareTealDark,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Editar perfil", color = PetCareTealDark)
                }
            }
        }
    }

    Spacer(modifier = Modifier.height(20.dp))

    Text(
        text = "Datos personales",
        modifier = Modifier.padding(start = 4.dp),
        style = MaterialTheme.typography.titleMedium
    )

    Spacer(modifier = Modifier.height(10.dp))

    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = elevacionTarjeta(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, PetCareLine),
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Column(modifier = Modifier.padding(vertical = 4.dp)) {
            DetailRow(
                iconRes = R.drawable.ic_person,
                label = "Nombre completo",
                value = nombreCompleto
            )
            HorizontalDivider(
                modifier = Modifier.padding(horizontal = 18.dp),
                color = PetCareLine
            )
            DetailRow(
                iconRes = R.drawable.ic_mail,
                label = "Correo electrónico",
                value = profile.email
            )
            HorizontalDivider(
                modifier = Modifier.padding(horizontal = 18.dp),
                color = PetCareLine
            )
            DetailRow(
                iconRes = R.drawable.ic_phone,
                label = "Teléfono",
                value = profile.telefono?.ifBlank { null },
                emptyText = "Sin especificar"
            )
        }
    }
}

@Composable
private fun DetailRow(
    iconRes: Int,
    label: String,
    value: String?,
    emptyText: String = "Sin especificar"
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 18.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Surface(
            modifier = Modifier.size(40.dp),
            shape = CircleShape,
            color = PetCareTealSoft
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    painter = painterResource(iconRes),
                    contentDescription = null,
                    tint = PetCareTealDark,
                    modifier = Modifier.size(20.dp)
                )
            }
        }

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = label,
                color = PetCareMuted,
                style = MaterialTheme.typography.labelMedium
            )
            Text(
                text = value ?: emptyText,
                color = if (value == null) PetCareMuted else MaterialTheme.colorScheme.onSurface,
                style = MaterialTheme.typography.bodyLarge
            )
        }
    }
}
