package com.petcare.app.features.perdidas.ui

import com.petcare.app.ui.components.elevacionBoton
import com.petcare.app.ui.components.elevacionBotonContorno
import com.petcare.app.ui.components.elevacionTarjeta
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
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import com.petcare.app.R
import com.petcare.app.features.perdidas.data.remote.DeteccionResponse
import com.petcare.app.features.perdidas.data.remote.UltimaDeteccionResponse
import com.petcare.app.ui.theme.PetCareError
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.ui.theme.PetCareTealDark

/**
 * Aviso preventivo (P1-210): la red colaborativa detectó a una mascota que no
 * está reportada como perdida, lejos de la casa de sus dueños.
 *
 * El dueño decide qué hacer con lo que ve en el mapa:
 * - **Reportar como perdida**: abre el reporte con la ubicación y la hora de la
 *   detección ya cargadas.
 * - **Está conmigo**: silencia estos avisos por 3 horas, por ejemplo si la sacó
 *   a pasear y otro celular la detectó en la plaza.
 *
 * Si mientras tanto alguien ya la reportó (es compartida, o el dueño volvió al
 * aviso después), la detección trae el reporte y se ofrece ir directo a él.
 */
@Composable
fun AvisoFueraDeCasaScreen(
    isLoading: Boolean,
    errorMessage: String?,
    ubicacion: UltimaDeteccionResponse?,
    isSilenciando: Boolean,
    silenciarError: String?,
    onRetry: () -> Unit,
    onReportarPerdida: (DeteccionResponse) -> Unit,
    onEstaConmigo: () -> Unit,
    onVerReporte: (idReporte: Int) -> Unit,
    onBack: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .systemBarsPadding()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 12.dp),
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
                Text(
                    text = "Fuera de casa",
                    style = MaterialTheme.typography.headlineSmall
                )
                ubicacion?.nombreMascota?.let { nombre ->
                    Text(
                        text = "Detectaron a " + nombre + " lejos de tu casa",
                        color = PetCareMuted,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }
        }

        val deteccion = ubicacion?.ultimaDeteccion
        val idReporte = ubicacion?.idReporte

        when {
            isLoading -> {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    CircularProgressIndicator()
                }
            }

            errorMessage != null -> {
                TarjetaError(detalle = errorMessage, onRetry = onRetry)
            }

            // La detección se borra a los 7 días si no terminó en un reporte.
            deteccion == null -> {
                AvisoVencido()
            }

            else -> {
                MapaDeteccion(deteccion = deteccion) {
                    Spacer(modifier = Modifier.height(8.dp))
                    if (idReporte != null) {
                        Text(
                            text = "Ya está reportada como perdida.",
                            style = MaterialTheme.typography.bodyMedium
                        )
                        Button(
                            elevation = elevacionBoton(),
                            onClick = { onVerReporte(idReporte) },
                            modifier = Modifier.fillMaxWidth(),
                            shape = MaterialTheme.shapes.large
                        ) {
                            Text("Ver última ubicación")
                        }
                    } else {
                        Button(
                            elevation = elevacionBoton(),
                            onClick = { onReportarPerdida(deteccion) },
                            enabled = !isSilenciando,
                            modifier = Modifier.fillMaxWidth(),
                            shape = MaterialTheme.shapes.large,
                            colors = ButtonDefaults.buttonColors(containerColor = PetCareError)
                        ) {
                            Text("Reportar como perdida")
                        }
                        OutlinedButton(
                            elevation = elevacionBotonContorno(),
                            colors = ButtonDefaults.outlinedButtonColors(
                                containerColor = MaterialTheme.colorScheme.surface
                            ),
                            onClick = onEstaConmigo,
                            enabled = !isSilenciando,
                            modifier = Modifier.fillMaxWidth(),
                            shape = MaterialTheme.shapes.large
                        ) {
                            if (isSilenciando) {
                                CircularProgressIndicator(modifier = Modifier.height(20.dp))
                            } else {
                                Text("Está conmigo")
                            }
                        }
                        Text(
                            text = "\"Está conmigo\" pausa estos avisos por 3 horas.",
                            color = PetCareMuted,
                            style = MaterialTheme.typography.bodySmall
                        )
                        silenciarError?.let { mensaje ->
                            Text(
                                text = mensaje,
                                color = MaterialTheme.colorScheme.error,
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AvisoVencido() {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp),
        elevation = elevacionTarjeta(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, PetCareLine),
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = "Este aviso ya no tiene ubicación",
                style = MaterialTheme.typography.titleMedium
            )
            Text(
                text = "Las detecciones fuera de casa se guardan por 7 días. Si la " +
                    "detectan de nuevo, te vamos a avisar.",
                color = PetCareMuted,
                style = MaterialTheme.typography.bodyMedium
            )
        }
    }
}
