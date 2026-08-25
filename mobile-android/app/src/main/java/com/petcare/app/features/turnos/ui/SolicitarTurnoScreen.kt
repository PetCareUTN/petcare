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
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.petcare.app.features.pets.data.remote.PetResponse
import com.petcare.app.features.servicios.data.remote.ServicioResponse
import com.petcare.app.features.servicios.ui.categoriaLabel
import com.petcare.app.features.turnos.data.remote.DisponibilidadTurnoResponse
import com.petcare.app.features.turnos.data.remote.VeterinariaResponse
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMint
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.ui.theme.PetCareTeal
import com.petcare.app.ui.theme.PetCareTealSoft
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone

private val DIAS_SEMANA = listOf(
    "domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"
)

private enum class TipoTurno { VETERINARIA, PASEADOR, GUARDERIA, PELUQUERIA }

private fun TipoTurno.label(): String = when (this) {
    TipoTurno.VETERINARIA -> "Veterinaria"
    TipoTurno.PASEADOR -> categoriaLabel("paseador")
    TipoTurno.GUARDERIA -> categoriaLabel("guarderia")
    TipoTurno.PELUQUERIA -> categoriaLabel("peluqueria")
}

private fun TipoTurno.categoria(): String? = when (this) {
    TipoTurno.VETERINARIA -> null
    TipoTurno.PASEADOR -> "paseador"
    TipoTurno.GUARDERIA -> "guarderia"
    TipoTurno.PELUQUERIA -> "peluqueria"
}

private fun TipoTurno.slotMinutos(): Int = if (this == TipoTurno.GUARDERIA) 60 else 30

private data class RangoDisponible(val diaSemana: String, val horaInicio: String, val horaFin: String)

@Composable
fun SolicitarTurnoScreen(
    pets: List<PetResponse>,
    veterinarias: List<VeterinariaResponse>,
    isLoadingVeterinarias: Boolean,
    disponibilidadesVeterinaria: List<DisponibilidadTurnoResponse>,
    isLoadingDisponibilidadesVeterinaria: Boolean,
    serviciosPorCategoria: List<ServicioResponse>,
    isLoadingServiciosPorCategoria: Boolean,
    isSaving: Boolean,
    errorMessage: String?,
    successMessage: String?,
    onSelectVeterinaria: (idVeterinario: Int) -> Unit,
    onSelectCategoria: (categoria: String) -> Unit,
    onSolicitarVeterinario: (
        idMascota: Int,
        idVeterinario: Int,
        fecha: String,
        hora: String,
        motivoConsulta: String?,
    ) -> Unit,
    onSolicitarServicio: (
        idMascota: Int,
        idServicio: Int,
        fecha: String,
        horaInicio: String,
        notas: String?,
    ) -> Unit,
    onBack: () -> Unit
) {
    var tipo by rememberSaveable { mutableStateOf<TipoTurno?>(null) }
    var selectedPetId by rememberSaveable { mutableStateOf<Int?>(null) }
    var selectedVeterinariaId by rememberSaveable { mutableStateOf<Int?>(null) }
    var selectedServicioId by rememberSaveable { mutableStateOf<Int?>(null) }
    var selectedFecha by rememberSaveable { mutableStateOf("") }
    var selectedHora by rememberSaveable { mutableStateOf<String?>(null) }
    var notas by rememberSaveable { mutableStateOf("") }
    var formError by rememberSaveable { mutableStateOf<String?>(null) }

    val selectedServicio = serviciosPorCategoria.find { it.id == selectedServicioId }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .systemBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        verticalArrangement = Arrangement.Top,
        horizontalAlignment = Alignment.Start
    ) {
        Text(
            text = "Solicitar turno",
            style = MaterialTheme.typography.headlineMedium
        )
        Text(
            text = "Elegí el tipo de turno, tu mascota y un horario disponible.",
            color = PetCareMuted,
            style = MaterialTheme.typography.bodyMedium
        )

        Spacer(modifier = Modifier.height(20.dp))

        if (successMessage != null) {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = PetCareTealSoft,
                shape = MaterialTheme.shapes.large
            ) {
                Text(
                    text = successMessage,
                    modifier = Modifier.padding(16.dp),
                    color = PetCareTeal,
                    style = MaterialTheme.typography.bodyLarge
                )
            }
            Spacer(modifier = Modifier.height(16.dp))
            Button(
                onClick = onBack,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = MaterialTheme.shapes.large
            ) {
                Text("Volver")
            }
            return@Column
        }

        if (pets.isEmpty()) {
            EmptyPetsCard()
        } else {
            Text(text = "Tipo de turno", style = MaterialTheme.typography.titleSmall)
            Spacer(modifier = Modifier.height(8.dp))
            TipoTurno.entries.forEach { opcion ->
                SelectableOptionCard(
                    title = opcion.label(),
                    subtitle = "",
                    selected = tipo == opcion,
                    onClick = {
                        if (tipo != opcion) {
                            tipo = opcion
                            selectedVeterinariaId = null
                            selectedServicioId = null
                            selectedFecha = ""
                            selectedHora = null
                            formError = null
                            opcion.categoria()?.let { onSelectCategoria(it) }
                        }
                    }
                )
                Spacer(modifier = Modifier.height(8.dp))
            }

            Spacer(modifier = Modifier.height(4.dp))
            Text(text = "Mascota", style = MaterialTheme.typography.titleSmall)
            Spacer(modifier = Modifier.height(8.dp))
            pets.forEach { pet ->
                SelectableOptionCard(
                    title = pet.nombre,
                    subtitle = listOfNotNull(pet.especie, pet.raza).joinToString(" · "),
                    selected = pet.id == selectedPetId,
                    onClick = {
                        selectedPetId = pet.id
                        formError = null
                    }
                )
                Spacer(modifier = Modifier.height(8.dp))
            }

            if (tipo == TipoTurno.VETERINARIA) {
                Spacer(modifier = Modifier.height(12.dp))
                Text(text = "Veterinaria", style = MaterialTheme.typography.titleSmall)
                Spacer(modifier = Modifier.height(8.dp))

                when {
                    isLoadingVeterinarias -> {
                        Column(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            CircularProgressIndicator()
                        }
                    }
                    veterinarias.isEmpty() -> {
                        Text(
                            text = "No hay veterinarias disponibles por el momento",
                            color = PetCareMuted,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                    else -> {
                        veterinarias.forEach { veterinaria ->
                            SelectableOptionCard(
                                title = veterinaria.nombre,
                                subtitle = veterinaria.direccion ?: "",
                                selected = veterinaria.idVeterinario == selectedVeterinariaId,
                                onClick = {
                                    selectedVeterinariaId = veterinaria.idVeterinario
                                    selectedFecha = ""
                                    selectedHora = null
                                    formError = null
                                    onSelectVeterinaria(veterinaria.idVeterinario)
                                }
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                        }
                    }
                }
            } else if (tipo != null) {
                val categoriaTexto = tipo!!.label()
                Spacer(modifier = Modifier.height(12.dp))
                Text(text = "Prestador de $categoriaTexto", style = MaterialTheme.typography.titleSmall)
                Spacer(modifier = Modifier.height(8.dp))

                when {
                    isLoadingServiciosPorCategoria -> {
                        Column(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            CircularProgressIndicator()
                        }
                    }
                    serviciosPorCategoria.isEmpty() -> {
                        Text(
                            text = "No hay prestadores de $categoriaTexto disponibles por el momento",
                            color = PetCareMuted,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                    else -> {
                        serviciosPorCategoria.forEach { servicio ->
                            SelectableOptionCard(
                                title = servicio.nombrePrestador,
                                subtitle = servicio.descripcion ?: "",
                                selected = servicio.id == selectedServicioId,
                                onClick = {
                                    selectedServicioId = servicio.id
                                    selectedFecha = ""
                                    selectedHora = null
                                    formError = null
                                }
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                        }
                    }
                }
            }

            val proveedorElegido = when (tipo) {
                TipoTurno.VETERINARIA -> selectedVeterinariaId != null
                null -> false
                else -> selectedServicioId != null
            }

            if (proveedorElegido) {
                Spacer(modifier = Modifier.height(12.dp))
                TurnoDatePickerField(
                    selectedDate = selectedFecha,
                    onDateSelected = {
                        selectedFecha = it
                        selectedHora = null
                        formError = null
                    }
                )
            }

            if (selectedFecha.isNotBlank()) {
                Spacer(modifier = Modifier.height(16.dp))
                Text(text = "Horario disponible", style = MaterialTheme.typography.titleSmall)
                Spacer(modifier = Modifier.height(8.dp))

                val cargandoDisponibilidad =
                    tipo == TipoTurno.VETERINARIA && isLoadingDisponibilidadesVeterinaria

                if (cargandoDisponibilidad) {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        CircularProgressIndicator()
                    }
                } else {
                    val rangos = if (tipo == TipoTurno.VETERINARIA) {
                        disponibilidadesVeterinaria.map {
                            RangoDisponible(it.diaSemana, it.horaInicio, it.horaFin)
                        }
                    } else {
                        (selectedServicio?.disponibilidades ?: emptyList()).map {
                            RangoDisponible(it.diaSemana, it.horaInicio, it.horaFin)
                        }
                    }
                    val slotMinutos = tipo?.slotMinutos() ?: 30
                    val slots = generarSlots(rangos, selectedFecha, slotMinutos)

                    if (slots.isEmpty()) {
                        Text(
                            text = "No hay horarios configurados para ese día",
                            color = PetCareMuted,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    } else {
                        slots.chunked(3).forEach { fila ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                fila.forEach { hora ->
                                    SlotChip(
                                        label = hora,
                                        selected = hora == selectedHora,
                                        modifier = Modifier.weight(1f),
                                        onClick = {
                                            selectedHora = hora
                                            formError = null
                                        }
                                    )
                                }
                                repeat(3 - fila.size) {
                                    Spacer(modifier = Modifier.weight(1f))
                                }
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                        }
                    }
                }
            }

            if (selectedHora != null) {
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = if (tipo == TipoTurno.VETERINARIA) "Motivo de consulta (opcional)" else "Notas para el prestador (opcional)",
                    style = MaterialTheme.typography.titleSmall
                )
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = notas,
                    onValueChange = { notas = it },
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text("Ej: control anual, vacunación...") }
                )
            }

            val error = formError ?: errorMessage
            if (error != null) {
                Spacer(modifier = Modifier.height(12.dp))
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = PetCareTealSoft,
                    shape = MaterialTheme.shapes.medium
                ) {
                    Text(
                        text = error,
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier.padding(12.dp),
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            Button(
                onClick = {
                    val petId = selectedPetId
                    val hora = selectedHora
                    when {
                        tipo == null -> formError = "Elegí el tipo de turno"
                        petId == null -> formError = "Elegí una mascota"
                        tipo == TipoTurno.VETERINARIA && selectedVeterinariaId == null ->
                            formError = "Elegí una veterinaria"
                        tipo != TipoTurno.VETERINARIA && selectedServicioId == null ->
                            formError = "Elegí un prestador"
                        selectedFecha.isBlank() -> formError = "Elegí una fecha"
                        hora == null -> formError = "Elegí un horario"
                        tipo == TipoTurno.VETERINARIA -> onSolicitarVeterinario(
                            petId,
                            selectedVeterinariaId!!,
                            selectedFecha,
                            hora,
                            notas.trim().ifBlank { null }
                        )
                        else -> onSolicitarServicio(
                            petId,
                            selectedServicioId!!,
                            selectedFecha,
                            hora,
                            notas.trim().ifBlank { null }
                        )
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                enabled = !isSaving,
                shape = MaterialTheme.shapes.large
            ) {
                if (isSaving) {
                    CircularProgressIndicator(
                        modifier = Modifier.height(22.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Text("Solicitar turno")
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        TextButton(
            onClick = onBack,
            enabled = !isSaving,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Cancelar")
        }
    }
}

@Composable
private fun SelectableOptionCard(
    title: String,
    subtitle: String,
    selected: Boolean,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = if (selected) PetCareTealSoft else MaterialTheme.colorScheme.surface
        ),
        border = BorderStroke(1.dp, if (selected) PetCareTeal else PetCareLine),
        shape = MaterialTheme.shapes.large
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Text(text = title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                if (subtitle.isNotBlank()) {
                    Text(text = subtitle, color = PetCareMuted, style = MaterialTheme.typography.bodyMedium)
                }
            }
            if (selected) {
                Text(text = "Seleccionada", color = PetCareTeal, style = MaterialTheme.typography.labelLarge)
            }
        }
    }
}

@Composable
private fun SlotChip(
    label: String,
    selected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Surface(
        modifier = modifier.clickable(onClick = onClick),
        color = if (selected) PetCareTeal else PetCareMint,
        shape = MaterialTheme.shapes.large,
        border = BorderStroke(1.dp, if (selected) PetCareTeal else PetCareLine)
    ) {
        Text(
            text = label,
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 10.dp),
            color = if (selected) MaterialTheme.colorScheme.onPrimary else PetCareTeal,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            style = MaterialTheme.typography.labelLarge
        )
    }
}

@Composable
private fun EmptyPetsCard() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = PetCareMint),
        border = BorderStroke(1.dp, PetCareLine),
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(20.dp),
            horizontalAlignment = Alignment.Start
        ) {
            Text(
                text = "Todavía no tenés mascotas registradas",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = "Registrá una mascota para poder solicitar un turno.",
                color = PetCareMuted,
                style = MaterialTheme.typography.bodyMedium
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TurnoDatePickerField(
    selectedDate: String,
    onDateSelected: (String) -> Unit
) {
    var showPicker by remember { mutableStateOf(false) }
    val datePickerState = rememberDatePickerState(
        initialSelectedDateMillis = selectedDate.toFechaMillis(),
        selectableDates = object : androidx.compose.material3.SelectableDates {
            override fun isSelectableDate(utcTimeMillis: Long): Boolean =
                utcTimeMillis >= hoyMillis()
        }
    )

    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(text = "Fecha", style = MaterialTheme.typography.labelLarge)

        OutlinedButton(
            onClick = { showPicker = true },
            modifier = Modifier.fillMaxWidth(),
            shape = MaterialTheme.shapes.large,
            border = BorderStroke(1.dp, PetCareLine)
        ) {
            Text(
                text = selectedDate.ifBlank { "Seleccionar fecha" },
                color = if (selectedDate.isBlank()) PetCareMuted else MaterialTheme.colorScheme.onSurface
            )
        }
    }

    if (showPicker) {
        DatePickerDialog(
            onDismissRequest = { showPicker = false },
            confirmButton = {
                TextButton(
                    onClick = {
                        datePickerState.selectedDateMillis?.let {
                            onDateSelected(it.toFechaText())
                        }
                        showPicker = false
                    }
                ) {
                    Text("Aceptar")
                }
            },
            dismissButton = {
                TextButton(onClick = { showPicker = false }) {
                    Text("Cancelar")
                }
            }
        ) {
            DatePicker(state = datePickerState)
        }
    }
}

private fun horaToMinutos(hora: String): Int {
    val partes = hora.split(":")
    return partes[0].toInt() * 60 + partes[1].toInt()
}

private fun minutosToHora(minutos: Int): String =
    "%02d:%02d".format(minutos / 60, minutos % 60)

private fun diaSemanaDe(fecha: String): String? {
    val millis = fecha.toFechaMillis() ?: return null
    val calendar = Calendar.getInstance(TimeZone.getTimeZone("UTC"))
    calendar.timeInMillis = millis
    return DIAS_SEMANA[calendar.get(Calendar.DAY_OF_WEEK) - 1]
}

private fun generarSlots(
    disponibilidades: List<RangoDisponible>,
    fecha: String,
    slotMinutos: Int
): List<String> {
    val dia = diaSemanaDe(fecha) ?: return emptyList()
    return disponibilidades
        .filter { it.diaSemana == dia }
        .flatMap { disponibilidad ->
            val inicio = horaToMinutos(disponibilidad.horaInicio)
            val fin = horaToMinutos(disponibilidad.horaFin)
            generateSequence(inicio) { it + slotMinutos }
                .takeWhile { it + slotMinutos <= fin }
                .map { minutosToHora(it) }
        }
        .sorted()
}

private fun fechaFormatter(): SimpleDateFormat =
    SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

private fun hoyMillis(): Long {
    val calendar = Calendar.getInstance(TimeZone.getTimeZone("UTC"))
    calendar.set(Calendar.HOUR_OF_DAY, 0)
    calendar.set(Calendar.MINUTE, 0)
    calendar.set(Calendar.SECOND, 0)
    calendar.set(Calendar.MILLISECOND, 0)
    return calendar.timeInMillis
}

private fun Long.toFechaText(): String = fechaFormatter().format(this)

private fun String.toFechaMillis(): Long? =
    takeIf { it.isNotBlank() }?.let {
        runCatching { fechaFormatter().parse(it)?.time }.getOrNull()
    }
