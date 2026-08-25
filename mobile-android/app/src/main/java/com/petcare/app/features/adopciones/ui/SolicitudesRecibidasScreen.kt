package com.petcare.app.features.adopciones.ui

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
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
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
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.petcare.app.R
import com.petcare.app.features.adopciones.data.remote.SolicitudAdopcionResponse
import com.petcare.app.ui.theme.PetCareError
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.ui.theme.PetCareSurfaceSoft
import com.petcare.app.ui.theme.PetCareTeal
import com.petcare.app.ui.theme.PetCareTealDark
import com.petcare.app.ui.theme.PetCareTealSoft
import com.petcare.app.ui.theme.PetCareWarning

@Composable
fun SolicitudesRecibidasScreen(
    isLoading: Boolean,
    errorMessage: String?,
    solicitudes: List<SolicitudAdopcionResponse>,
    processingId: Int?,
    onBack: () -> Unit,
    onRetry: () -> Unit,
    onAceptar: (SolicitudAdopcionResponse) -> Unit,
    onRechazar: (SolicitudAdopcionResponse, String) -> Unit
) {
    var solicitudARechazar by remember { mutableStateOf<SolicitudAdopcionResponse?>(null) }

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
                Text(text = "Solicitudes recibidas", style = MaterialTheme.typography.headlineSmall)
                Text(
                    text = "Gestioná los pedidos de adopción de tus publicaciones",
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

            solicitudes.isEmpty() -> {
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
                            text = "Todavía no recibiste solicitudes",
                            style = MaterialTheme.typography.titleMedium
                        )
                        Text(
                            text = "Cuando alguien pida adoptar una de tus mascotas publicadas, va a aparecer acá.",
                            color = PetCareMuted,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            }

            else -> {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(solicitudes, key = { it.idSolicitud }) { solicitud ->
                        SolicitudRow(
                            solicitud = solicitud,
                            isProcessing = processingId == solicitud.idSolicitud,
                            onAceptar = { onAceptar(solicitud) },
                            onRechazar = { solicitudARechazar = solicitud }
                        )
                    }
                }
            }
        }
    }

    solicitudARechazar?.let { solicitud ->
        RechazarSolicitudDialog(
            onConfirm = { motivo ->
                onRechazar(solicitud, motivo)
                solicitudARechazar = null
            },
            onDismiss = { solicitudARechazar = null }
        )
    }
}

@Composable
private fun SolicitudRow(
    solicitud: SolicitudAdopcionResponse,
    isProcessing: Boolean,
    onAceptar: () -> Unit,
    onRechazar: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, PetCareLine),
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = solicitud.nombreMascota,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                EstadoBadge(estado = solicitud.estado)
            }

            Text(
                text = "Interesado: ${solicitud.nombreSolicitante}",
                style = MaterialTheme.typography.bodyMedium
            )
            Text(
                text = solicitud.emailSolicitante,
                color = PetCareMuted,
                style = MaterialTheme.typography.bodySmall
            )
            solicitud.telefonoSolicitante?.takeIf { it.isNotBlank() }?.let {
                Text(text = it, color = PetCareMuted, style = MaterialTheme.typography.bodySmall)
            }
            solicitud.motivoRechazo?.takeIf { it.isNotBlank() }?.let { motivo ->
                Text(
                    text = "Motivo del rechazo: $motivo",
                    color = PetCareError,
                    style = MaterialTheme.typography.bodyMedium
                )
            }

            if (solicitud.estado == "PENDIENTE") {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedButton(
                        onClick = onAceptar,
                        modifier = Modifier.weight(1f),
                        enabled = !isProcessing,
                        shape = MaterialTheme.shapes.large
                    ) {
                        Text("Aceptar")
                    }
                    OutlinedButton(
                        onClick = onRechazar,
                        modifier = Modifier.weight(1f),
                        enabled = !isProcessing,
                        shape = MaterialTheme.shapes.large,
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.error)
                    ) {
                        Text(
                            text = if (isProcessing) "Procesando..." else "Rechazar",
                            color = MaterialTheme.colorScheme.error
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun EstadoBadge(estado: String) {
    val color = when (estado) {
        "ACEPTADA" -> PetCareTeal
        "PENDIENTE" -> PetCareWarning
        "RECHAZADA" -> PetCareError
        else -> PetCareMuted
    }
    Surface(
        color = if (estado == "ACEPTADA") PetCareTealSoft else PetCareSurfaceSoft,
        shape = MaterialTheme.shapes.small
    ) {
        Text(
            text = estado.lowercase().replaceFirstChar { it.uppercase() },
            color = color,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelMedium
        )
    }
}

@Composable
private fun RechazarSolicitudDialog(
    onConfirm: (String) -> Unit,
    onDismiss: () -> Unit
) {
    var motivo by rememberSaveable { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Rechazar solicitud") },
        text = {
            Column {
                Text("Contale al interesado por qué no podés avanzar con la adopción.")
                Spacer(modifier = Modifier.height(12.dp))
                OutlinedTextField(
                    value = motivo,
                    onValueChange = { motivo = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Motivo") },
                    singleLine = false
                )
            }
        },
        confirmButton = {
            TextButton(
                enabled = motivo.isNotBlank(),
                onClick = { onConfirm(motivo.trim()) }
            ) {
                Text("Rechazar", color = MaterialTheme.colorScheme.error)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancelar")
            }
        }
    )
}
