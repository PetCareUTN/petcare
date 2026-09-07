package com.petcare.app.features.adopciones.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.petcare.app.R
import com.petcare.app.features.adopciones.data.remote.PublicacionAdopcionResponse
import com.petcare.app.features.pets.ui.resolvePetPhotoUrl
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.ui.theme.PetCareSurfaceSoft
import com.petcare.app.ui.theme.PetCareTeal
import com.petcare.app.ui.theme.PetCareTealDark
import com.petcare.app.ui.theme.PetCareTealSoft

@Composable
fun AdopcionDetalleScreen(
    isLoading: Boolean,
    errorMessage: String?,
    publicacion: PublicacionAdopcionResponse?,
    onBack: () -> Unit,
    onRetry: () -> Unit,
    onMeInteresaClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.Top,
        horizontalAlignment = Alignment.Start
    ) {
        when {
            isLoading -> {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 60.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    CircularProgressIndicator()
                }
            }

            errorMessage != null -> {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconButton(onClick = onBack) {
                            Icon(
                                painter = painterResource(R.drawable.ic_arrow_back),
                                contentDescription = "Volver",
                                tint = PetCareTealDark
                            )
                        }
                        Text(text = "Detalle de la publicación", style = MaterialTheme.typography.headlineSmall)
                    }
                    Spacer(modifier = Modifier.height(18.dp))
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
            }

            publicacion != null -> {
                val mascota = publicacion.mascota

                Box(modifier = Modifier.fillMaxWidth()) {
                    val fotoUrl = remember(mascota.foto) { resolvePetPhotoUrl(mascota.foto) }
                    if (fotoUrl != null) {
                        AsyncImage(
                            model = fotoUrl,
                            contentDescription = mascota.nombre,
                            modifier = Modifier
                                .fillMaxWidth()
                                .aspectRatio(1f),
                            contentScale = ContentScale.Crop
                        )
                    } else {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .aspectRatio(1f)
                                .background(PetCareTealSoft),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                painter = painterResource(R.drawable.ic_paw),
                                contentDescription = null,
                                modifier = Modifier.size(72.dp),
                                tint = PetCareTeal
                            )
                        }
                    }
                    IconButton(onClick = onBack, modifier = Modifier.padding(6.dp)) {
                        Surface(color = androidx.compose.ui.graphics.Color.White.copy(alpha = 0.85f), shape = androidx.compose.foundation.shape.CircleShape) {
                            Icon(
                                painter = painterResource(R.drawable.ic_arrow_back),
                                contentDescription = "Volver",
                                modifier = Modifier.padding(8.dp),
                                tint = PetCareTealDark
                            )
                        }
                    }
                }

                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = mascota.nombre,
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.weight(1f)
                        )
                        Surface(color = PetCareTealSoft, shape = MaterialTheme.shapes.large) {
                            Text(
                                text = mascota.especie,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                color = PetCareTealDark,
                                style = MaterialTheme.typography.labelLarge
                            )
                        }
                    }

                    Text(
                        text = listOfNotNull(
                            mascota.edadAnios?.let { if (it == 1) "1 año" else "$it años" },
                            sexoLabel(mascota.sexo)
                        ).joinToString(" · "),
                        color = PetCareMuted,
                        style = MaterialTheme.typography.bodyLarge
                    )

                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        border = BorderStroke(1.dp, PetCareLine),
                        shape = MaterialTheme.shapes.extraLarge
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            mascota.raza?.let { DatoFila("Raza", it) }
                            tamanoLabel(publicacion.tamano)?.let { DatoFila("Tamaño", it) }
                            publicacion.ubicacion?.takeIf { it.isNotBlank() }?.let { DatoFila("Ubicación", it) }
                        }
                    }

                    Text(
                        text = "Sobre mí",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = publicacion.descripcion,
                        color = PetCareMuted,
                        style = MaterialTheme.typography.bodyMedium
                    )

                    val caracteristicas = buildList {
                        if (mascota.esterilizado) add("Castrado/a")
                        if (publicacion.vacunado) add("Vacunado/a")
                        if (publicacion.compatiblePerros) add("Convive con perros")
                        if (publicacion.compatibleGatos) add("Convive con gatos")
                        if (publicacion.compatibleNinos) add("Convive con niños")
                        if (publicacion.necesitaPatio) add("🏠 Necesita patio")
                    }
                    if (caracteristicas.isNotEmpty()) {
                        Text(
                            text = "Características",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold
                        )
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            caracteristicas.forEach { texto ->
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    if (!texto.startsWith("🏠")) {
                                        Icon(
                                            painter = painterResource(R.drawable.ic_check),
                                            contentDescription = null,
                                            modifier = Modifier.size(18.dp),
                                            tint = PetCareTeal
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                    }
                                    Text(text = texto, style = MaterialTheme.typography.bodyMedium)
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Button(
                        onClick = onMeInteresaClick,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        shape = MaterialTheme.shapes.large
                    ) {
                        Text("ME INTERESA")
                    }

                    Spacer(modifier = Modifier.height(12.dp))
                }
            }
        }
    }
}

@Composable
private fun DatoFila(etiqueta: String, valor: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(text = etiqueta, color = PetCareMuted, style = MaterialTheme.typography.bodyMedium)
        Text(text = valor, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
    }
}
