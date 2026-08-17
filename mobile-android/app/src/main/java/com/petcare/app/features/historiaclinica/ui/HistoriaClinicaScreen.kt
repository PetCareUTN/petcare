package com.petcare.app.features.historiaclinica.ui

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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
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
import com.petcare.app.features.historiaclinica.data.remote.EventoClinicoResponse
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.ui.theme.PetCareTeal

private val EVENT_TYPE_LABELS = mapOf(
    "consulta" to "Consulta",
    "vacuna" to "Vacuna",
    "diagnostico" to "Diagnostico",
    "tratamiento" to "Tratamiento",
    "cirugia" to "Cirugia",
    "control" to "Control",
    "observacion" to "Observacion",
    "otro" to "Otro"
)

@Composable
fun HistoriaClinicaScreen(
    isLoading: Boolean,
    errorMessage: String?,
    eventos: List<EventoClinicoResponse>,
    isExporting: Boolean,
    exportMessage: String?,
    canExport: Boolean,
    onExportPdf: () -> Unit,
    onExportArchivos: () -> Unit,
    onRetry: () -> Unit,
    onBack: () -> Unit
) {
    val hasArchivos = eventos.any { it.archivos.isNotEmpty() }
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
                text = "Historia clinica",
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

        if (!isLoading && errorMessage == null && eventos.isNotEmpty()) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = onExportPdf,
                    enabled = canExport && !isExporting,
                    modifier = Modifier.fillMaxWidth(),
                    shape = MaterialTheme.shapes.large
                ) {
                    Text("Exportar historial (PDF)")
                }
                OutlinedButton(
                    onClick = onExportArchivos,
                    enabled = hasArchivos && !isExporting,
                    modifier = Modifier.fillMaxWidth(),
                    shape = MaterialTheme.shapes.large
                ) {
                    Text(
                        if (hasArchivos) "Exportar archivos medicos"
                        else "Sin archivos medicos adjuntos"
                    )
                }
                if (isExporting) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        CircularProgressIndicator(modifier = Modifier.height(20.dp))
                        Spacer(modifier = Modifier.height(0.dp))
                        Text(
                            text = "  Exportando...",
                            color = PetCareMuted,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
                exportMessage?.let {
                    Text(
                        text = it,
                        color = PetCareTeal,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }

            Spacer(modifier = Modifier.height(18.dp))
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

            eventos.isEmpty() -> {
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
                            text = "Todavia no hay eventos clinicos registrados",
                            style = MaterialTheme.typography.titleMedium
                        )
                        Text(
                            text = "Cuando tu veterinario registre una consulta, va a aparecer aca.",
                            color = PetCareMuted,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            }

            else -> {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    eventos.forEach { evento ->
                        EventoCard(evento = evento)
                    }
                }
            }
        }
    }
}

@Composable
private fun EventoCard(evento: EventoClinicoResponse) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, PetCareLine),
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    color = PetCareTeal.copy(alpha = 0.14f),
                    shape = MaterialTheme.shapes.large
                ) {
                    Text(
                        text = EVENT_TYPE_LABELS[evento.tipo] ?: evento.tipo,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        color = PetCareTeal,
                        style = MaterialTheme.typography.labelLarge
                    )
                }
                Text(
                    text = evento.fecha,
                    color = PetCareMuted,
                    style = MaterialTheme.typography.bodyMedium
                )
            }

            Text(
                text = evento.descripcion,
                style = MaterialTheme.typography.bodyLarge
            )

            evento.diagnostico?.let {
                Text(
                    text = "Diagnostico: $it",
                    color = PetCareMuted,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
            evento.tratamiento?.let {
                Text(
                    text = "Tratamiento: $it",
                    color = PetCareMuted,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
            evento.observaciones?.let {
                Text(
                    text = "Observaciones: $it",
                    color = PetCareMuted,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }
    }
}
