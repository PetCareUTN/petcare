package com.petcare.app.features.adopciones.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.petcare.app.R
import com.petcare.app.features.adopciones.data.remote.PublicacionAdopcionResponse
import com.petcare.app.features.pets.ui.resolvePetPhotoUrl
import com.petcare.app.ui.theme.PetCareError
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.ui.theme.PetCareSurfaceSoft
import com.petcare.app.ui.theme.PetCareTeal
import com.petcare.app.ui.theme.PetCareTealDark
import com.petcare.app.ui.theme.PetCareTealSoft
import com.petcare.app.ui.theme.PetCareWarning

@Composable
fun MisPublicacionesAdopcionScreen(
    isLoading: Boolean,
    errorMessage: String?,
    publicaciones: List<PublicacionAdopcionResponse>,
    solicitudesPorPublicacion: Map<Int, Int>,
    pendientesPorPublicacion: Map<Int, Int>,
    procesandoId: Int?,
    onBack: () -> Unit,
    onRetry: () -> Unit,
    onVerSolicitudes: () -> Unit,
    onPausar: (PublicacionAdopcionResponse) -> Unit,
    onReanudar: (PublicacionAdopcionResponse) -> Unit,
    onCancelar: (PublicacionAdopcionResponse) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .systemBarsPadding()
            .padding(20.dp),
        verticalArrangement = Arrangement.Top,
        horizontalAlignment = Alignment.Start
    ) {
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
            Column(modifier = Modifier.weight(1f)) {
                Text(text = "Mis publicaciones", style = MaterialTheme.typography.headlineSmall)
                Text(
                    text = "Mascotas que publicaste en adopción",
                    color = PetCareMuted,
                    style = MaterialTheme.typography.bodyMedium
                )
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
                    colors = CardDefaults.cardColors(containerColor = PetCareSurfaceSoft),
                    border = BorderStroke(1.dp, PetCareLine),
                    shape = MaterialTheme.shapes.extraLarge
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
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

            publicaciones.isEmpty() -> {
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
                            text = "Todavía no publicaste ninguna mascota",
                            style = MaterialTheme.typography.titleMedium
                        )
                        Text(
                            text = "Lo que publiques en adopción va a aparecer acá.",
                            color = PetCareMuted,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            }

            else -> {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(publicaciones, key = { it.idPublicacion }) { publicacion ->
                        MiPublicacionRow(
                            publicacion = publicacion,
                            cantidadSolicitudes = solicitudesPorPublicacion[publicacion.idPublicacion] ?: 0,
                            cantidadPendientes = pendientesPorPublicacion[publicacion.idPublicacion] ?: 0,
                            isProcessing = procesandoId == publicacion.idPublicacion,
                            onVerSolicitudes = onVerSolicitudes,
                            onPausar = { onPausar(publicacion) },
                            onReanudar = { onReanudar(publicacion) },
                            onCancelar = { onCancelar(publicacion) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun MiPublicacionRow(
    publicacion: PublicacionAdopcionResponse,
    cantidadSolicitudes: Int,
    cantidadPendientes: Int,
    isProcessing: Boolean,
    onVerSolicitudes: () -> Unit,
    onPausar: () -> Unit,
    onReanudar: () -> Unit,
    onCancelar: () -> Unit
) {
    val mascota = publicacion.mascota
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, PetCareLine),
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                val fotoUrl = remember(mascota.foto) { resolvePetPhotoUrl(mascota.foto) }
                if (fotoUrl != null) {
                    AsyncImage(
                        model = fotoUrl,
                        contentDescription = mascota.nombre,
                        modifier = Modifier
                            .size(56.dp)
                            .clip(RoundedCornerShape(14.dp)),
                        contentScale = ContentScale.Crop
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .size(56.dp)
                            .clip(RoundedCornerShape(14.dp))
                            .background(PetCareTealSoft),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            painter = painterResource(R.drawable.ic_paw),
                            contentDescription = null,
                            tint = PetCareTeal
                        )
                    }
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = mascota.nombre,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = listOfNotNull(mascota.especie, mascota.raza).joinToString(" · "),
                        color = PetCareMuted,
                        style = MaterialTheme.typography.bodySmall
                    )
                }

                EstadoPublicacionBadge(publicacion.estado)
            }

            Text(
                text = when {
                    cantidadPendientes == 1 -> "1 pendiente de responder"
                    cantidadPendientes > 1 -> "$cantidadPendientes pendientes de responder"
                    cantidadSolicitudes == 0 -> "Sin solicitudes"
                    cantidadSolicitudes == 1 -> "1 solicitud"
                    else -> "$cantidadSolicitudes solicitudes"
                },
                color = if (cantidadPendientes > 0) PetCareTealDark else PetCareMuted,
                fontWeight = if (cantidadPendientes > 0) FontWeight.SemiBold else FontWeight.Normal,
                style = MaterialTheme.typography.bodySmall
            )

            if (cantidadPendientes > 0) {
                Button(
                    onClick = onVerSolicitudes,
                    modifier = Modifier.fillMaxWidth(),
                    shape = MaterialTheme.shapes.large
                ) {
                    Text("VER SOLICITUDES ($cantidadPendientes)")
                }
            } else if (cantidadSolicitudes > 0) {
                OutlinedButton(
                    onClick = onVerSolicitudes,
                    modifier = Modifier.fillMaxWidth(),
                    shape = MaterialTheme.shapes.large
                ) {
                    Text("VER SOLICITUDES")
                }
            }

            when (publicacion.estado) {
                "ACTIVA" -> {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedButton(
                            onClick = onPausar,
                            enabled = !isProcessing,
                            modifier = Modifier.weight(1f),
                            shape = MaterialTheme.shapes.large
                        ) {
                            Text("Pausar")
                        }
                        OutlinedButton(
                            onClick = onCancelar,
                            enabled = !isProcessing,
                            modifier = Modifier.weight(1f),
                            shape = MaterialTheme.shapes.large,
                            border = BorderStroke(1.dp, PetCareError)
                        ) {
                            Text("Cancelar", color = PetCareError)
                        }
                    }
                }
                "PAUSADA" -> {
                    OutlinedButton(
                        onClick = onReanudar,
                        enabled = !isProcessing,
                        modifier = Modifier.fillMaxWidth(),
                        shape = MaterialTheme.shapes.large
                    ) {
                        Text("Reanudar publicación")
                    }
                }
                else -> Unit
            }
        }
    }
}

@Composable
private fun EstadoPublicacionBadge(estado: String) {
    val (texto, color) = when (estado) {
        "ACTIVA" -> "Disponible" to PetCareTeal
        "PAUSADA" -> "Pausada" to PetCareWarning
        "CERRADA" -> "Adoptada" to PetCareTeal
        "CANCELADA" -> "Cancelada" to PetCareMuted
        else -> estado to PetCareMuted
    }
    Surface(color = PetCareSurfaceSoft, shape = MaterialTheme.shapes.small) {
        Text(
            text = texto,
            color = color,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelMedium
        )
    }
}
