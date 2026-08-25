package com.petcare.app.features.servicios.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import com.petcare.app.features.turnos.data.remote.ReservaServicioRecibidaResponse
import com.petcare.app.ui.theme.PetCareError
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.ui.theme.PetCareSurfaceSoft
import com.petcare.app.ui.theme.PetCareTeal
import com.petcare.app.ui.theme.PetCareTealDark
import com.petcare.app.ui.theme.PetCareTealSoft

private enum class FiltroEstado(val valor: String, val etiqueta: String) {
    CONFIRMADO("confirmado", "Confirmados"),
    CANCELADO("cancelado", "Cancelados")
}

@Composable
fun SolicitudesServiciosRecibidasScreen(
    isLoading: Boolean,
    errorMessage: String?,
    turnos: List<ReservaServicioRecibidaResponse>,
    procesandoId: Int?,
    onBack: () -> Unit,
    onRetry: () -> Unit,
    onCancelar: (ReservaServicioRecibidaResponse, String?) -> Unit
) {
    var filtro by rememberSaveable { mutableStateOf(FiltroEstado.CONFIRMADO) }
    var turnoACancelar by remember { mutableStateOf<ReservaServicioRecibidaResponse?>(null) }

    val turnosFiltrados = turnos.filter { it.estado == filtro.valor }

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
                    text = "Turnos que te reservaron en tus servicios publicados.",
                    color = PetCareMuted,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            FiltroEstado.entries.forEach { opcion ->
                FiltroChip(
                    texto = opcion.etiqueta,
                    seleccionado = filtro == opcion,
                    onClick = { filtro = opcion },
                    modifier = Modifier.weight(1f)
                )
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

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

            turnosFiltrados.isEmpty() -> {
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
                            text = "No hay turnos ${filtro.etiqueta.lowercase()}",
                            style = MaterialTheme.typography.titleMedium
                        )
                        Text(
                            text = "Cuando alguien reserve uno de tus servicios, va a aparecer acá.",
                            color = PetCareMuted,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            }

            else -> {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(turnosFiltrados, key = { it.idTurno }) { turno ->
                        TurnoRow(
                            turno = turno,
                            isProcessing = procesandoId == turno.idTurno,
                            onCancelar = { turnoACancelar = turno }
                        )
                    }
                }
            }
        }
    }

    turnoACancelar?.let { turno ->
        CancelarDialog(
            onConfirm = { motivo ->
                onCancelar(turno, motivo)
                turnoACancelar = null
            },
            onDismiss = { turnoACancelar = null }
        )
    }
}

@Composable
private fun FiltroChip(
    texto: String,
    seleccionado: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier.clickable(onClick = onClick),
        color = if (seleccionado) PetCareTeal else MaterialTheme.colorScheme.surface,
        shape = MaterialTheme.shapes.large,
        border = BorderStroke(1.dp, if (seleccionado) PetCareTeal else PetCareLine)
    ) {
        Text(
            text = texto,
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 11.dp),
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            maxLines = 1,
            color = if (seleccionado) androidx.compose.ui.graphics.Color.White else PetCareTealDark,
            style = MaterialTheme.typography.labelMedium
        )
    }
}

@Composable
private fun TurnoRow(
    turno: ReservaServicioRecibidaResponse,
    isProcessing: Boolean,
    onCancelar: () -> Unit
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
                Column {
                    Text(
                        text = turno.nombreMascota,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = categoriaLabel(turno.categoria),
                        color = PetCareTealDark,
                        style = MaterialTheme.typography.labelMedium
                    )
                }
                EstadoBadge(estado = turno.estado)
            }

            Text(
                text = "${formatFecha(turno.fecha)} · ${turno.horaInicio.take(5)} a ${turno.horaFin.take(5)}",
                style = MaterialTheme.typography.bodyMedium
            )
            Text(
                text = "Dueño: ${turno.nombreDuenio}",
                style = MaterialTheme.typography.bodyMedium
            )
            Text(
                text = turno.emailDuenio,
                color = PetCareMuted,
                style = MaterialTheme.typography.bodySmall
            )
            turno.telefonoDuenio?.takeIf { it.isNotBlank() }?.let {
                Text(text = it, color = PetCareMuted, style = MaterialTheme.typography.bodySmall)
            }
            turno.notas?.takeIf { it.isNotBlank() }?.let { notas ->
                Text(text = notas, style = MaterialTheme.typography.bodyMedium)
            }
            turno.motivoCancelacion?.takeIf { it.isNotBlank() }?.let { motivo ->
                Text(
                    text = "Cancelado por ${turno.canceladoPor}: $motivo",
                    color = PetCareError,
                    style = MaterialTheme.typography.bodyMedium
                )
            }

            if (turno.estado == "confirmado") {
                OutlinedButton(
                    onClick = onCancelar,
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !isProcessing,
                    shape = MaterialTheme.shapes.large,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.error)
                ) {
                    Text(
                        text = if (isProcessing) "Cancelando..." else "Cancelar",
                        color = MaterialTheme.colorScheme.error
                    )
                }
            }
        }
    }
}

@Composable
private fun EstadoBadge(estado: String) {
    val color = when (estado) {
        "confirmado" -> PetCareTeal
        "cancelado" -> PetCareError
        else -> PetCareMuted
    }
    Surface(
        color = if (estado == "confirmado") PetCareTealSoft else PetCareSurfaceSoft,
        shape = MaterialTheme.shapes.small
    ) {
        Text(
            text = estado.replaceFirstChar { it.uppercase() },
            color = color,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelMedium
        )
    }
}

@Composable
private fun CancelarDialog(
    onConfirm: (String?) -> Unit,
    onDismiss: () -> Unit
) {
    var motivo by rememberSaveable { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Cancelar turno") },
        text = {
            Column {
                Text("Contale al dueño por qué no vas a poder atenderlo (opcional).")
                Spacer(modifier = Modifier.height(12.dp))
                OutlinedTextField(
                    value = motivo,
                    onValueChange = { motivo = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Motivo (opcional)") },
                    singleLine = false
                )
            }
        },
        confirmButton = {
            TextButton(onClick = { onConfirm(motivo.trim().ifBlank { null }) }) {
                Text("Cancelar turno", color = MaterialTheme.colorScheme.error)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Volver")
            }
        }
    )
}

private fun formatFecha(fecha: String): String {
    val partes = fecha.split("-")
    return if (partes.size == 3) {
        "${partes[2]}/${partes[1]}/${partes[0]}"
    } else {
        fecha
    }
}
