package com.petcare.app.features.turnos.ui

import com.petcare.app.ui.components.LocalEspacioBarraInferior
import com.petcare.app.ui.components.elevacionTarjeta
import com.petcare.app.ui.components.elevacionBoton
import com.petcare.app.ui.components.elevacionBotonContorno
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
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
    onCancelar: (TurnoUnificado, String?) -> Unit,
    onResenasClick: () -> Unit,
    /** (es veterinario, id) del turno al que llevó una notificación, si hubo. */
    turnoDestacado: Pair<Boolean, Int>? = null,
    onVerTodosLosTurnos: () -> Unit = {}
) {
    var rango by rememberSaveable { mutableStateOf(RangoFecha.TODOS) }
    // Prefijo ISO: "2026-08-26" filtra un dia y "2026-08" un mes completo.
    var filtroFecha by rememberSaveable { mutableStateOf<String?>(null) }
    var showDatePicker by rememberSaveable { mutableStateOf(false) }
    var turnoACancelar by remember { mutableStateOf<TurnoUnificado?>(null) }

    val hoy = hoyIso()
    // Las fechas vienen en formato ISO (yyyy-MM-dd), asi que se pueden
    // comparar como texto para saber si son anteriores o posteriores a hoy.
    // El turno de la notificación va aparte, arriba de todo, y no se repite en
    // las listas (las keys de LazyColumn no pueden duplicarse).
    val destacado = turnoDestacado?.let { (esVet, id) ->
        turnos.firstOrNull { it.idTurno == id && (it.tipo == TipoTurnoItem.VETERINARIA) == esVet }
    }
    val turnosOrdenados = turnos
        .filter { it !== destacado }
        .sortedWith(compareBy({ it.fecha }, { it.horaInicio }))
    val turnosFiltrados = turnosOrdenados.filter { turno ->
        val coincideFecha = filtroFecha == null || turno.fecha.startsWith(filtroFecha!!)
        val coincideRango = when (rango) {
            RangoFecha.TODOS -> true
            RangoFecha.PROXIMOS -> turno.fecha >= hoy
            RangoFecha.ANTERIORES -> turno.fecha < hoy
        }
        coincideFecha && coincideRango
    }

    // Los próximos primero, del más cercano al más lejano; los anteriores
    // después, del más reciente al más viejo.
    val proximos = turnosFiltrados.filter { it.fecha >= hoy }
    val anteriores = turnosFiltrados.filter { it.fecha < hoy }.asReversed()

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        // La barra superior ya resuelve los insets: sumarlos de nuevo dejaba un
        // hueco grande arriba del titulo.
        contentWindowInsets = WindowInsets(0, 0, 0, 0)
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(innerPadding),
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
                        text = "Mis turnos",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            item(key = "nuevo") {
                Button(
                    elevation = elevacionBoton(),
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
            }

            if (!isLoading && errorMessage == null && destacado != null) {
                item(key = "destacado") {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "Turno de la notificación",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            TextButton(onClick = onVerTodosLosTurnos) {
                                Text("Ver todos", style = MaterialTheme.typography.labelMedium)
                            }
                        }
                        TurnoCard(
                            turno = destacado,
                            isCancelando = cancelandoId == destacado.idTurno,
                            onCancelarClick = { turnoACancelar = destacado },
                            esPasado = destacado.fecha < hoy
                        )
                    }
                }
            }

            if (!isLoading && errorMessage == null && turnos.isNotEmpty()) {
                item(key = "filtros") {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
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

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedButton(
                                elevation = elevacionBotonContorno(),
                                onClick = { showDatePicker = true },
                                modifier = Modifier.weight(1f),
                                shape = MaterialTheme.shapes.large,
                                border = BorderStroke(1.dp, PetCareLine),
                                colors = ButtonDefaults.outlinedButtonColors(containerColor = androidx.compose.material3.MaterialTheme.colorScheme.surface, 
                                    contentColor = PetCareTealDark
                                )
                            ) {
                                Icon(
                                    painter = painterResource(R.drawable.ic_calendar),
                                    contentDescription = null,
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
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
                    InfoCard(titulo = null) {
                        Text(
                            text = errorMessage,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodyMedium
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Button(elevation = elevacionBoton(), onClick = onRetry) {
                            Text("Reintentar")
                        }
                    }
                }

                turnos.isEmpty() -> item(key = "vacio") {
                    InfoCard(titulo = "Todavía no tenés turnos") {
                        Text(
                            text = "Cuando solicites un turno para alguna de tus mascotas, " +
                                "va a aparecer acá.",
                            color = PetCareMuted,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }

                turnosFiltrados.isEmpty() && destacado == null -> item(key = "sin-resultados") {
                    InfoCard(titulo = "Sin turnos para ese filtro") {
                        Text(
                            text = "Probá con otra fecha o mostrá todos los turnos.",
                            color = PetCareMuted,
                            style = MaterialTheme.typography.bodyMedium
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Button(
                            elevation = elevacionBoton(),
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
                    if (proximos.isNotEmpty()) {
                        item(key = "titulo-proximos") {
                            TituloSeccion(texto = "Próximos", cantidad = proximos.size)
                        }
                        items(proximos, key = { "${it.tipo}-${it.idTurno}" }) { turno ->
                            TurnoCard(
                                turno = turno,
                                isCancelando = cancelandoId == turno.idTurno,
                                onCancelarClick = { turnoACancelar = turno }
                            )
                        }
                    }
                    if (anteriores.isNotEmpty()) {
                        item(key = "titulo-anteriores") {
                            TituloSeccion(texto = "Anteriores", cantidad = anteriores.size)
                        }
                        items(anteriores, key = { "${it.tipo}-${it.idTurno}" }) { turno ->
                            TurnoCard(
                                turno = turno,
                                isCancelando = cancelandoId == turno.idTurno,
                                onCancelarClick = { turnoACancelar = turno },
                                esPasado = true
                            )
                        }
                    }
                }
            }

            // Al final de la pantalla: es algo que se hace después de usar un
            // servicio, no lo primero que se busca al entrar a Mis turnos.
            item(key = "resenas") {
                Spacer(modifier = Modifier.height(8.dp))
                DejaTuResenaCard(onClick = onResenasClick)
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
        shadowElevation = 2.dp,
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
        elevation = elevacionTarjeta(),
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
private fun TituloSeccion(texto: String, cantidad: Int) {
    Row(
        modifier = Modifier.padding(top = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text(
            text = texto,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )
        Surface(color = PetCareTealSoft, shape = MaterialTheme.shapes.small) {
            Text(
                text = cantidad.toString(),
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                color = PetCareTealDark,
                style = MaterialTheme.typography.labelMedium
            )
        }
    }
}

private fun iconoDeTipo(tipo: TipoTurnoItem): Int = when (tipo) {
    TipoTurnoItem.VETERINARIA -> R.drawable.ic_turno_veterinaria
    TipoTurnoItem.PASEADOR -> R.drawable.ic_turno_paseador
    TipoTurnoItem.GUARDERIA -> R.drawable.ic_turno_guarderia
    TipoTurnoItem.PELUQUERIA -> R.drawable.ic_turno_peluqueria
}

private val MESES_CORTOS = listOf(
    "ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"
)

@Composable
private fun TurnoCard(
    turno: TurnoUnificado,
    isCancelando: Boolean,
    onCancelarClick: () -> Unit,
    /** Un turno que ya pasó no se puede cancelar. */
    esPasado: Boolean = false
) {
    val partesFecha = turno.fecha.split("-")
    val dia = partesFecha.getOrNull(2)?.toIntOrNull()?.toString() ?: "--"
    val mes = partesFecha.getOrNull(1)?.toIntOrNull()
        ?.let { MESES_CORTOS.getOrNull(it - 1) } ?: ""
    val inactivo = turno.estado.lowercase() in listOf("cancelado", "rechazado")

    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = elevacionTarjeta(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        border = BorderStroke(1.dp, PetCareLine),
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Fecha a la vista: es lo primero que se busca en un turno.
            Surface(
                modifier = Modifier.width(58.dp),
                color = if (inactivo) PetCareSurfaceSoft else PetCareTealSoft,
                shape = MaterialTheme.shapes.large
            ) {
                Column(
                    modifier = Modifier.padding(vertical = 10.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = dia,
                        color = if (inactivo) PetCareMuted else PetCareTealDark,
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = mes,
                        color = if (inactivo) PetCareMuted else PetCareTealDark,
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = turno.nombreMascota,
                        modifier = Modifier.weight(1f),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    EstadoBadge(estado = turno.estado)
                }

                val horario = if (turno.horaFin != null) {
                    "${formatHora(turno.horaInicio)} a ${formatHora(turno.horaFin)}"
                } else {
                    formatHora(turno.horaInicio)
                }

                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        painter = painterResource(iconoDeTipo(turno.tipo)),
                        contentDescription = null,
                        tint = PetCareTealDark,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "${tipoLabel(turno.tipo)} · $horario",
                        color = PetCareTealDark,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium
                    )
                }

                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = turno.contraparteNombre,
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
                        color = PetCareMuted,
                        style = MaterialTheme.typography.bodySmall
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
                        style = MaterialTheme.typography.bodySmall
                    )
                }

                if (turno.puedeCancelar && !esPasado) {
                    Spacer(modifier = Modifier.height(10.dp))
                    OutlinedButton(
                        elevation = elevacionBotonContorno(),
                        colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(containerColor = androidx.compose.material3.MaterialTheme.colorScheme.surface),
                        onClick = onCancelarClick,
                        enabled = !isCancelando,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(40.dp),
                        shape = MaterialTheme.shapes.large,
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.error)
                    ) {
                        Text(
                            text = if (isCancelando) "Cancelando..." else "Cancelar turno",
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.labelLarge
                        )
                    }
                }
            }
        }
    }
}

/**
 * Acceso a las reseñas, al final de la pantalla. Lleva a los servicios ya
 * realizados, donde se deja la reseña o se hace un reporte.
 */
@Composable
private fun DejaTuResenaCard(onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        elevation = elevacionTarjeta(),
        colors = CardDefaults.cardColors(containerColor = PetCareTealSoft),
        border = BorderStroke(1.dp, PetCareTeal.copy(alpha = 0.35f)),
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(18.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Surface(
                modifier = Modifier.size(44.dp),
                shape = CircleShape,
                color = PetCareTeal
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        painter = painterResource(R.drawable.ic_star),
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(22.dp)
                    )
                }
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Dejá tu reseña",
                    color = PetCareTealDark,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Contanos cómo te fue con los servicios que usaste.",
                    color = PetCareTealDark,
                    style = MaterialTheme.typography.bodySmall
                )
            }
            Icon(
                painter = painterResource(R.drawable.ic_chevron_right),
                contentDescription = null,
                tint = PetCareTealDark,
                modifier = Modifier.size(22.dp)
            )
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
