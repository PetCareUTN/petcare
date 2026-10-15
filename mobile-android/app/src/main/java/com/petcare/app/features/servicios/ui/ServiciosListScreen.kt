package com.petcare.app.features.servicios.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
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
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.petcare.app.R
import com.petcare.app.features.servicios.data.remote.ServicioResponse
import com.petcare.app.ui.components.AvisoFormulario
import com.petcare.app.ui.components.FilaEtiquetas
import com.petcare.app.ui.theme.PetCareError
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.ui.theme.PetCareSurfaceSoft
import com.petcare.app.ui.theme.PetCareTeal
import com.petcare.app.ui.theme.PetCareTealDark
import com.petcare.app.ui.theme.PetCareTealSoft

@Composable
fun ServiciosListScreen(
    isLoading: Boolean,
    errorMessage: String?,
    servicios: List<ServicioResponse>,
    deletingId: Int?,
    onRetry: () -> Unit,
    onCreateServicio: () -> Unit,
    onEditServicio: (ServicioResponse) -> Unit,
    onDeleteServicio: (ServicioResponse) -> Unit,
    onSolicitudesRecibidasClick: () -> Unit,
    onValidacionClick: () -> Unit
) {
    var servicioToDelete by remember { mutableStateOf<ServicioResponse?>(null) }

    // Sin insets propios: los resuelve la pantalla que contiene a esta.
    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        contentWindowInsets = WindowInsets(0, 0, 0, 0)
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(innerPadding),
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            item(key = "encabezado") {
                Column {
                    Text(
                        text = "Mis servicios",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Publicá y administrá lo que ofrecés a otros dueños.",
                        color = PetCareMuted,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }

            item(key = "publicar") {
                Button(
                    onClick = onCreateServicio,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(54.dp),
                    shape = MaterialTheme.shapes.large
                ) {
                    Icon(
                        painter = painterResource(R.drawable.ic_add),
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Publicar servicio")
                }
            }

            item(key = "accesos") {
                // Mosaicos del mismo alto aunque un texto ocupe más líneas.
                Row(
                    modifier = Modifier.height(IntrinsicSize.Min),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    AccesoServicio(
                        titulo = "Solicitudes recibidas",
                        detalle = "Reservas de tus clientes",
                        iconRes = R.drawable.ic_calendar,
                        onClick = onSolicitudesRecibidasClick,
                        modifier = Modifier.weight(1f)
                    )
                    AccesoServicio(
                        titulo = "Quiero ofrecer",
                        detalle = "Pedí aprobación",
                        iconRes = R.drawable.ic_check,
                        onClick = onValidacionClick,
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            item(key = "aviso") {
                AvisoFormulario(
                    texto = "Necesitás aprobación para publicar y recibir reservas de cada categoría.",
                    esError = false
                )
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

                servicios.isEmpty() -> item(key = "vacio") {
                    EstadoVacioServicios(onPublicar = onCreateServicio)
                }

                else -> {
                    item(key = "titulo-lista") {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text(
                                text = "Publicados",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Surface(color = PetCareTealSoft, shape = MaterialTheme.shapes.small) {
                                Text(
                                    text = servicios.size.toString(),
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                    color = PetCareTealDark,
                                    style = MaterialTheme.typography.labelMedium
                                )
                            }
                        }
                    }
                    items(servicios, key = { it.id }) { servicio ->
                        ServicioCard(
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
            text = {
                Text("¿Seguro que querés eliminar este servicio? Esta acción no se puede deshacer.")
            },
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

/** Acceso rápido en forma de mosaico: ícono arriba, título y una línea de contexto. */
@Composable
private fun AccesoServicio(
    titulo: String,
    detalle: String,
    iconRes: Int,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxHeight()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, PetCareLine),
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
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
            Column {
                Text(
                    text = titulo,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = detalle,
                    color = PetCareMuted,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
    }
}

@Composable
private fun EstadoVacioServicios(onPublicar: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, PetCareLine),
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Surface(
                modifier = Modifier.size(76.dp),
                shape = CircleShape,
                color = PetCareTealSoft
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        painter = painterResource(R.drawable.ic_services),
                        contentDescription = null,
                        tint = PetCareTeal,
                        modifier = Modifier.size(36.dp)
                    )
                }
            }
            Spacer(modifier = Modifier.height(14.dp))
            Text(
                text = "Todavía no publicaste ningún servicio",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = "Publicá tu primer servicio para que otros dueños de mascotas puedan encontrarte.",
                color = PetCareMuted,
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(16.dp))
            OutlinedButton(
                onClick = onPublicar,
                shape = MaterialTheme.shapes.large
            ) {
                Text("Publicar mi primer servicio")
            }
        }
    }
}

private fun iconoDeCategoria(categoria: String): Int = when (categoria) {
    "paseador" -> R.drawable.ic_turno_paseador
    "guarderia" -> R.drawable.ic_turno_guarderia
    "peluqueria" -> R.drawable.ic_turno_peluqueria
    else -> R.drawable.ic_services
}

private fun diaCorto(dia: String): String = when (dia) {
    "lunes" -> "Lun"
    "martes" -> "Mar"
    "miercoles" -> "Mié"
    "jueves" -> "Jue"
    "viernes" -> "Vie"
    "sabado" -> "Sáb"
    "domingo" -> "Dom"
    else -> dia
}

@Composable
private fun ServicioCard(
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
        Column(modifier = Modifier.padding(top = 16.dp, start = 16.dp, end = 16.dp, bottom = 4.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    modifier = Modifier.size(48.dp),
                    shape = CircleShape,
                    color = PetCareTealSoft
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            painter = painterResource(iconoDeCategoria(servicio.categoria)),
                            contentDescription = null,
                            tint = PetCareTealDark,
                            modifier = Modifier.size(26.dp)
                        )
                    }
                }
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    text = categoriaLabel(servicio.categoria),
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
            }

            servicio.descripcion?.takeIf { it.isNotBlank() }?.let {
                Spacer(modifier = Modifier.height(10.dp))
                Text(
                    text = it,
                    color = PetCareMuted,
                    style = MaterialTheme.typography.bodyMedium
                )
            }

            if (servicio.disponibilidades.isNotEmpty()) {
                Spacer(modifier = Modifier.height(14.dp))
                Text(
                    text = "Disponibilidad",
                    style = MaterialTheme.typography.labelLarge,
                    color = PetCareMuted
                )
                Spacer(modifier = Modifier.height(6.dp))
                FilaEtiquetas(
                    etiquetas = servicio.disponibilidades.map {
                        "${diaCorto(it.diaSemana)} ${it.horaInicio.take(5)}–${it.horaFin.take(5)}"
                    }
                )
            }

            Spacer(modifier = Modifier.height(10.dp))
            HorizontalDivider(color = PetCareLine)

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End
            ) {
                TextButton(onClick = onEdit, enabled = !isDeleting) {
                    Icon(
                        painter = painterResource(R.drawable.ic_edit),
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Editar")
                }
                TextButton(onClick = onDelete, enabled = !isDeleting) {
                    Icon(
                        painter = painterResource(R.drawable.ic_delete),
                        contentDescription = null,
                        tint = PetCareError,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = if (isDeleting) "Eliminando..." else "Eliminar",
                        color = PetCareError
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
