package com.petcare.app.features.turnos.ui

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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.petcare.app.R
import com.petcare.app.features.servicios.ui.categoriaLabel
import com.petcare.app.features.turnos.domain.TipoTurnoItem
import com.petcare.app.features.turnos.domain.TurnoUnificado
import com.petcare.app.ui.theme.PetCareError
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.ui.theme.PetCareSurfaceSoft
import com.petcare.app.ui.theme.PetCareTeal
import com.petcare.app.ui.theme.PetCareTealDark
import com.petcare.app.ui.theme.PetCareTealSoft
import com.petcare.app.ui.theme.PetCareWarning
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

private enum class RangoFecha(val etiqueta: String) {
    TODOS("Todos"),
    PROXIMOS("Próximos"),
    ANTERIORES("Anteriores")
}

@Composable
fun MisTurnosScreen(
    isLoading: Boolean,
    errorMessage: String?,
    turnos: List<TurnoUnificado>,
    cancelandoId: Int?,
    onRetry: () -> Unit,
    onNuevoTurno: () -> Unit,
    onCancelar: (TurnoUnificado, String?) -> Unit
) {
    var rango by rememberSaveable { mutableStateOf(RangoFecha.TODOS) }
    // Prefijo ISO: "2026-08-26" filtra un dia y "2026-08" un mes completo.
    var filtroFecha by rememberSaveable { mutableStateOf<String?>(null) }
    var showDatePicker by rememberSaveable { mutableStateOf(false) }
    var turnoACancelar by remember { mutableStateOf<TurnoUnificado?>(null) }

    val hoy = hoyIso()
    // Las fechas vienen en formato ISO (yyyy-MM-dd), asi que se pueden
    // comparar como texto para saber si son anteriores o posteriores a hoy.
    val turnosOrdenados = turnos.sortedWith(compareBy({ it.fecha }, { it.horaInicio }))
    val turnosFiltrados = turnosOrdenados.filter { turno ->
        val coincideFecha = filtroFecha == null || turno.fecha.startsWith(filtroFecha!!)
        val coincideRango = when (rango) {
            RangoFecha.TODOS -> true
            RangoFecha.PROXIMOS -> turno.fecha >= hoy
            RangoFecha.ANTERIORES -> turno.fecha < hoy
        }
        coincideFecha && coincideRango
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background
    ) { innerPadding ->
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(innerPadding)
            .padding(horizontal = 20.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.Top,
        horizontalAlignment = Alignment.Start
    ) {
        Text(
            text = "Mis turnos",
            style = MaterialTheme.typography.headlineMedium
        )
        Text(
            text = "Turnos de veterinaria y de servicios que solicitaste para tus mascotas.",
            color = PetCareMuted,
            style = MaterialTheme.typography.bodyMedium
        )

        Spacer(modifier = Modifier.height(14.dp))

        Button(
            onClick = onNuevoTurno,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            shape = MaterialTheme.shapes.large
        ) {
            Icon(
                painter = painterResource(R.drawable.ic_add),
                contentDescription = null,
                modifier = Modifier.height(18.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text("Nuevo turno")
        }

        if (!isLoading && errorMessage == null && turnos.isNotEmpty()) {
            Spacer(modifier = Modifier.height(14.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                RangoFecha.entries.forEach { opcion ->
                    RangoChip(
                        texto = opcion.etiqueta,
                        seleccionado = rango == opcion,
                        onClick = { rango = opcion },
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedButton(
                    onClick = { showDatePicker = true },
                    modifier = Modifier.weight(1f),
                    shape = MaterialTheme.shapes.large,
                    border = BorderStroke(1.dp, PetCareTeal),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = PetCareTealDark
                    )
                ) {
                    Text(
                        text = filtroFecha?.let { etiquetaFiltro(it) }
                            ?: "Filtrar por fecha o mes",
                        maxLines = 1,
                        softWrap = false,
                        style = MaterialTheme.typography.labelMedium
                    )
                }
                if (filtroFecha != null) {
                    TextButton(
                        onClick = { filtroFecha = null },
                        colors = ButtonDefaults.textButtonColors(
                            contentColor = PetCareTealDark
                        )
                    ) {
                        Text("Quitar", style = MaterialTheme.typography.labelMedium)
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        when {
            isLoading -> {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    CircularProgressIndicator()
                }
            }

            errorMessage != null -> {
                InfoCard(titulo = null) {
                    Text(
                        text = errorMessage,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Button(onClick = onRetry) {
                        Text("Reintentar")
                    }
                }
            }

            turnos.isEmpty() -> {
                InfoCard(titulo = "Todavía no tenés turnos") {
                    Text(
                        text = "Cuando solicites un turno para alguna de tus mascotas, " +
                            "va a aparecer acá.",
                        color = PetCareMuted,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }

            turnosFiltrados.isEmpty() -> {
                InfoCard(titulo = "Sin turnos para ese filtro") {
                    Text(
                        text = "Probá con otra fecha o mostrá todos los turnos.",
                        color = PetCareMuted,
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Button(
                        onClick = {
                            rango = RangoFecha.TODOS
                            filtroFecha = null
                        }
                    ) {
                        Text("Ver todos")
                    }
                }
            }

            else -> {
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(turnosFiltrados, key = { "${it.tipo}-${it.idTurno}" }) { turno ->
                        TurnoCard(
                            turno = turno,
                            isCancelando = cancelandoId == turno.idTurno,
                            onCancelarClick = { turnoACancelar = turno }
                        )
                    }
                }
            }
        }
    }
    }

    if (showDatePicker) {
        FiltroFechaDialog(
            onFiltroSeleccionado = { prefijo ->
                filtroFecha = prefijo
                showDatePicker = false
            },
            onDismiss = { showDatePicker = false }
        )
    }

    turnoACancelar?.let { turno ->
        CancelarTurnoDialog(
            onConfirm = { motivo ->
                onCancelar(turno, motivo)
                turnoACancelar = null
            },
            onDismiss = { turnoACancelar = null }
        )
    }
}

/**
 * Chip de filtro propio: el FilterChip de Material no permite achicar su
 * padding interno y recortaba etiquetas largas como "Anteriores".
 */
@Composable
private fun RangoChip(
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
                .padding(horizontal = 4.dp, vertical = 11.dp),
            textAlign = TextAlign.Center,
            maxLines = 1,
            softWrap = false,
            color = if (seleccionado) Color.White else PetCareTealDark,
            style = MaterialTheme.typography.labelMedium
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FiltroFechaDialog(
    onFiltroSeleccionado: (String) -> Unit,
    onDismiss: () -> Unit
) {
    val datePickerState = rememberDatePickerState()
    val fechaElegida = datePickerState.selectedDateMillis?.toIsoDate()

    DatePickerDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                TextButton(
                    enabled = fechaElegida != null,
                    onClick = {
                        // Solo el prefijo "yyyy-MM" para abarcar el mes entero.
                        fechaElegida?.let { onFiltroSeleccionado(it.take(7)) }
                    }
                ) {
                    Text("Todo el mes")
                }
                TextButton(
                    enabled = fechaElegida != null,
                    onClick = { fechaElegida?.let(onFiltroSeleccionado) }
                ) {
                    Text("Ese día")
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancelar")
            }
        }
    ) {
        DatePicker(state = datePickerState)
    }
}

@Composable
private fun CancelarTurnoDialog(
    onConfirm: (String?) -> Unit,
    onDismiss: () -> Unit
) {
    var motivo by rememberSaveable { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Cancelar turno") },
        text = {
            Column {
                Text("¿Seguro que querés cancelar este turno?")
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

@Composable
private fun InfoCard(
    titulo: String?,
    contenido: @Composable () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = PetCareSurfaceSoft),
        border = BorderStroke(1.dp, PetCareLine),
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            if (titulo != null) {
                Text(
                    text = titulo,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(modifier = Modifier.height(6.dp))
            }
            contenido()
        }
    }
}

private fun tipoLabel(tipo: TipoTurnoItem): String = when (tipo) {
    TipoTurnoItem.VETERINARIA -> "Veterinaria"
    TipoTurnoItem.PASEADOR -> categoriaLabel("paseador")
    TipoTurnoItem.GUARDERIA -> categoriaLabel("guarderia")
    TipoTurnoItem.PELUQUERIA -> categoriaLabel("peluqueria")
}

@Composable
private fun TurnoCard(
    turno: TurnoUnificado,
    isCancelando: Boolean,
    onCancelarClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        border = BorderStroke(1.dp, PetCareLine),
        shape = MaterialTheme.shapes.large
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
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
                        text = tipoLabel(turno.tipo),
                        color = PetCareTealDark,
                        style = MaterialTheme.typography.labelMedium
                    )
                }
                EstadoBadge(estado = turno.estado)
            }

            Spacer(modifier = Modifier.height(8.dp))

            val horario = if (turno.horaFin != null) {
                "${formatHora(turno.horaInicio)} a ${formatHora(turno.horaFin)}"
            } else {
                formatHora(turno.horaInicio)
            }
            Text(
                text = "${formatFecha(turno.fecha)} · $horario",
                color = PetCareTealDark,
                style = MaterialTheme.typography.bodyLarge
            )
            Text(
                text = turno.contraparteNombre,
                color = PetCareMuted,
                style = MaterialTheme.typography.bodyMedium
            )
            turno.contraparteDetalle?.takeIf { it.isNotBlank() }?.let { detalle ->
                Text(
                    text = detalle,
                    color = PetCareMuted,
                    style = MaterialTheme.typography.bodySmall
                )
            }
            turno.nota?.takeIf { it.isNotBlank() }?.let { nota ->
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = nota,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
            turno.motivoNegativo?.takeIf { it.isNotBlank() }?.let { motivo ->
                Spacer(modifier = Modifier.height(6.dp))
                val prefijo = if (turno.canceladoPor != null) {
                    "Cancelado por ${turno.canceladoPor}: "
                } else {
                    "Motivo del rechazo: "
                }
                Text(
                    text = "$prefijo$motivo",
                    color = PetCareError,
                    style = MaterialTheme.typography.bodyMedium
                )
            }

            if (turno.puedeCancelar) {
                Spacer(modifier = Modifier.height(10.dp))
                OutlinedButton(
                    onClick = onCancelarClick,
                    enabled = !isCancelando,
                    modifier = Modifier.fillMaxWidth(),
                    shape = MaterialTheme.shapes.large,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.error)
                ) {
                    Text(
                        text = if (isCancelando) "Cancelando..." else "Cancelar turno",
                        color = MaterialTheme.colorScheme.error
                    )
                }
            }
        }
    }
}

@Composable
private fun EstadoBadge(estado: String) {
    val color = when (estado.lowercase()) {
        "confirmado" -> PetCareTeal
        "pendiente" -> PetCareWarning
        "rechazado", "cancelado" -> PetCareError
        else -> PetCareMuted
    }
    Surface(
        color = if (estado.lowercase() == "confirmado") PetCareTealSoft else PetCareSurfaceSoft,
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

private val MESES = listOf(
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
)

/**
 * Etiqueta del filtro activo: "26/08/2026" para un dia y "Agosto 2026"
 * cuando el prefijo abarca el mes completo.
 */
private fun etiquetaFiltro(prefijo: String): String {
    val partes = prefijo.split("-")
    return when {
        partes.size == 3 -> formatFecha(prefijo)
        partes.size == 2 -> {
            val mes = partes[1].toIntOrNull()
            if (mes != null && mes in 1..12) {
                "${MESES[mes - 1]} ${partes[0]}"
            } else {
                prefijo
            }
        }
        else -> prefijo
    }
}

/** "2026-08-26" -> "26/08/2026" */
private fun formatFecha(fecha: String): String {
    val partes = fecha.split("-")
    return if (partes.size == 3) {
        "${partes[2]}/${partes[1]}/${partes[0]}"
    } else {
        fecha
    }
}

/** "10:00:00" -> "10:00" */
private fun formatHora(hora: String): String =
    hora.split(":").take(2).joinToString(":")

private fun isoFormatter(): SimpleDateFormat =
    SimpleDateFormat("yyyy-MM-dd", Locale.US)

private fun hoyIso(): String = isoFormatter().format(Date())

private fun Long.toIsoDate(): String =
    isoFormatter().apply { timeZone = TimeZone.getTimeZone("UTC") }.format(Date(this))
