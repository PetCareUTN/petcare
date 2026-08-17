package com.petcare.app.features.servicios.ui

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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.petcare.app.features.servicios.data.remote.ServicioResponse
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.ui.theme.PetCareSurfaceSoft
import com.petcare.app.ui.theme.PetCareTealDark
import com.petcare.app.ui.theme.PetCareTealSoft

@Composable
fun ServiciosListScreen(
    isLoading: Boolean,
    errorMessage: String?,
    servicios: List<ServicioResponse>,
    deletingId: Int?,
    onBack: () -> Unit,
    onRetry: () -> Unit,
    onCreateServicio: () -> Unit,
    onEditServicio: (ServicioResponse) -> Unit,
    onDeleteServicio: (ServicioResponse) -> Unit
) {
    var servicioToDelete by remember { mutableStateOf<ServicioResponse?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(20.dp),
        verticalArrangement = Arrangement.Top,
        horizontalAlignment = Alignment.Start
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(text = "Mis servicios", style = MaterialTheme.typography.headlineMedium)
                Text(
                    text = "Publica y administra tus servicios",
                    color = PetCareMuted,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
            OutlinedButton(onClick = onBack, shape = MaterialTheme.shapes.large) {
                Text("Cerrar")
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        Button(
            onClick = onCreateServicio,
            modifier = Modifier.fillMaxWidth(),
            shape = MaterialTheme.shapes.large
        ) {
            Text("+ Publicar servicio")
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

            servicios.isEmpty() -> {
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
                            text = "Todavia no publicaste ningun servicio",
                            style = MaterialTheme.typography.titleMedium
                        )
                        Text(
                            text = "Publica tu primer servicio para que los dueños de mascotas puedan encontrarte.",
                            color = PetCareMuted,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            }

            else -> {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(servicios, key = { it.id }) { servicio ->
                        ServicioRow(
                            servicio = servicio,
                            isDeleting = deletingId == servicio.id,
                            onEdit = { onEditServicio(servicio) },
                            onDelete = { servicioToDelete = servicio }
                        )
                    }
                }
            }
        }
    }

    servicioToDelete?.let { servicio ->
        AlertDialog(
            onDismissRequest = { servicioToDelete = null },
            title = { Text("Eliminar servicio") },
            text = { Text("¿Seguro que queres eliminar este servicio? Esta accion no se puede deshacer.") },
            confirmButton = {
                TextButton(onClick = {
                    onDeleteServicio(servicio)
                    servicioToDelete = null
                }) {
                    Text("Eliminar", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { servicioToDelete = null }) {
                    Text("Cancelar")
                }
            }
        )
    }
}

@Composable
private fun ServicioRow(
    servicio: ServicioResponse,
    isDeleting: Boolean,
    onEdit: () -> Unit,
    onDelete: () -> Unit
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
            Surface(
                color = PetCareTealSoft,
                shape = MaterialTheme.shapes.large
            ) {
                Text(
                    text = categoriaLabel(servicio.categoria),
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                    color = PetCareTealDark,
                    style = MaterialTheme.typography.labelLarge
                )
            }

            servicio.descripcion?.takeIf { it.isNotBlank() }?.let {
                Text(text = it, color = PetCareMuted, style = MaterialTheme.typography.bodyMedium)
            }

            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                servicio.disponibilidades.forEach { disponibilidad ->
                    Text(
                        text = "${diaLabel(disponibilidad.diaSemana)}: " +
                            "${disponibilidad.horaInicio.take(5)} a ${disponibilidad.horaFin.take(5)}",
                        color = PetCareMuted,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                OutlinedButton(
                    onClick = onEdit,
                    modifier = Modifier.weight(1f),
                    enabled = !isDeleting,
                    shape = MaterialTheme.shapes.large
                ) {
                    Text("Editar")
                }
                OutlinedButton(
                    onClick = onDelete,
                    modifier = Modifier.weight(1f),
                    enabled = !isDeleting,
                    shape = MaterialTheme.shapes.large,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.error)
                ) {
                    Text(
                        text = if (isDeleting) "Eliminando..." else "Eliminar",
                        color = MaterialTheme.colorScheme.error
                    )
                }
            }
        }
    }
}

internal fun categoriaLabel(categoria: String): String = when (categoria) {
    "paseador" -> "Paseador"
    "guarderia" -> "Guardería"
    "peluqueria" -> "Peluquería"
    else -> categoria
}

internal fun diaLabel(dia: String): String = when (dia) {
    "lunes" -> "Lunes"
    "martes" -> "Martes"
    "miercoles" -> "Miércoles"
    "jueves" -> "Jueves"
    "viernes" -> "Viernes"
    "sabado" -> "Sábado"
    "domingo" -> "Domingo"
    else -> dia
}
