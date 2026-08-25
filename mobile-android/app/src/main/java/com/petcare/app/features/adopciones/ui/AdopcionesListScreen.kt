package com.petcare.app.features.adopciones.ui

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
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.petcare.app.features.adopciones.data.remote.PublicacionAdopcionResponse
import com.petcare.app.features.auth.ui.PetCareBottomBar
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.ui.theme.PetCareSurfaceSoft
import com.petcare.app.ui.theme.PetCareTealDark
import com.petcare.app.ui.theme.PetCareTealSoft

@Composable
fun AdopcionesListScreen(
    isLoading: Boolean,
    errorMessage: String?,
    publicaciones: List<PublicacionAdopcionResponse>,
    onNavigateHome: () -> Unit,
    onNavigateServicios: () -> Unit,
    onNavigateTurnos: () -> Unit,
    onRetry: () -> Unit,
    onPublicacionClick: (PublicacionAdopcionResponse) -> Unit,
    onAddClick: () -> Unit
) {
    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        bottomBar = {
            PetCareBottomBar(
                selectedItem = "Adopción",
                onInicioClick = onNavigateHome,
                onServiciosClick = onNavigateServicios,
                onTurnosClick = onNavigateTurnos,
                onAdopcionClick = {}
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(innerPadding)
                .padding(20.dp),
            verticalArrangement = Arrangement.Top,
            horizontalAlignment = Alignment.Start
        ) {
            Text(text = "Mascotas en adopción", style = MaterialTheme.typography.headlineSmall)
            Text(
                text = "Conocé a las mascotas que buscan un nuevo hogar",
                color = PetCareMuted,
                style = MaterialTheme.typography.bodyMedium
            )

            Spacer(modifier = Modifier.height(14.dp))

            Button(
                onClick = onAddClick,
                modifier = Modifier.fillMaxWidth(),
                shape = MaterialTheme.shapes.large
            ) {
                Text("Publicar mascota en adopción")
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
                                text = "Todavía no hay mascotas en adopción",
                                style = MaterialTheme.typography.titleMedium
                            )
                            Text(
                                text = "Cuando alguien publique una mascota, va a aparecer acá.",
                                color = PetCareMuted,
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }
                    }
                }

                else -> {
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        items(publicaciones, key = { it.idPublicacion }) { publicacion ->
                            PublicacionAdopcionRow(
                                publicacion = publicacion,
                                onClick = { onPublicacionClick(publicacion) }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PublicacionAdopcionRow(
    publicacion: PublicacionAdopcionResponse,
    onClick: () -> Unit
) {
    val mascota = publicacion.mascota
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
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
                    text = mascota.nombre,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                androidx.compose.material3.Surface(
                    color = PetCareTealSoft,
                    shape = MaterialTheme.shapes.large
                ) {
                    Text(
                        text = listOfNotNull(mascota.especie, mascota.raza).joinToString(" · "),
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                        color = PetCareTealDark,
                        style = MaterialTheme.typography.labelLarge
                    )
                }
            }

            Text(
                text = publicacion.descripcion,
                color = PetCareMuted,
                style = MaterialTheme.typography.bodyMedium,
                maxLines = 3
            )
        }
    }
}
