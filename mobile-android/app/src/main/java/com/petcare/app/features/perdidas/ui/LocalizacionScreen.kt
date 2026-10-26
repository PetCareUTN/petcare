package com.petcare.app.features.perdidas.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.petcare.app.features.perdidas.data.remote.ReportePerdidaResponse
import com.petcare.app.ui.components.LocalEspacioBarraInferior
import com.petcare.app.ui.theme.PetCareMuted

/**
 * Pestaña "Localización": las mascotas que el usuario reportó como perdidas,
 * cada una con acceso a su última ubicación conocida (US-37).
 */
@Composable
fun LocalizacionScreen(
    isLoading: Boolean,
    errorMessage: String?,
    reportes: List<ReportePerdidaResponse>,
    onRetry: () -> Unit,
    onVerUltimaUbicacion: (Int) -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(
            start = 20.dp,
            top = 12.dp,
            end = 20.dp,
            bottom = 12.dp + LocalEspacioBarraInferior.current
        ),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item(key = "encabezado") {
            Column {
                Text(
                    text = "Localización",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        when {
            isLoading -> item(key = "cargando") {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    CircularProgressIndicator()
                }
            }

            errorMessage != null -> item(key = "error") {
                Tarjeta {
                    Text(
                        text = errorMessage,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Button(onClick = onRetry) { Text("Reintentar") }
                }
            }

            reportes.isEmpty() -> item(key = "vacio") {
                Tarjeta {
                    Text(
                        text = "No tenés mascotas perdidas",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "Si una de tus mascotas se pierde, reportala desde su perfil. " +
                            "Cuando otro celular con PetCare detecte su tag, vas a ver acá " +
                            "dónde estuvo por última vez.",
                        color = PetCareMuted,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }

            else -> items(reportes, key = { it.idReporte }) { reporte ->
                Tarjeta {
                    Text(
                        text = reporte.nombreMascota ?: "Mascota",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Perdida desde el ${fechaCorta(reporte.fechaPerdida)}",
                        color = PetCareMuted,
                        style = MaterialTheme.typography.bodyMedium
                    )
                    reporte.descripcion?.takeIf { it.isNotBlank() }?.let {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(text = it, style = MaterialTheme.typography.bodyMedium)
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    Button(
                        onClick = { onVerUltimaUbicacion(reporte.idReporte) },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Ver última ubicación")
                    }
                }
            }
        }
    }
}

@Composable
private fun Tarjeta(contenido: @Composable () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.large,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(16.dp)) { contenido() }
    }
}

/** "2026-10-18T12:00:00.000Z" o "2026-10-18" -> "18/10/2026". */
private fun fechaCorta(fecha: String): String {
    val partes = fecha.take(10).split("-")
    return if (partes.size == 3) "${partes[2]}/${partes[1]}/${partes[0]}" else fecha
}
