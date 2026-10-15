package com.petcare.app.features.servicios.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.petcare.app.features.servicios.data.remote.DisponibilidadRequest
import com.petcare.app.features.servicios.data.remote.ServicioResponse
import com.petcare.app.features.servicios.domain.ServicioValidationResult
import com.petcare.app.features.servicios.domain.ServicioValidator
import com.petcare.app.R
import com.petcare.app.ui.components.AvisoFormulario
import com.petcare.app.ui.components.BarraAccionFormulario
import com.petcare.app.ui.components.CampoSeleccion
import com.petcare.app.ui.components.CampoToque
import com.petcare.app.ui.components.EncabezadoFormulario
import com.petcare.app.ui.components.GrupoChips
import com.petcare.app.ui.components.SeccionFormulario
import com.petcare.app.ui.theme.PetCareSurfaceSoft
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.ui.theme.PetCareTealDark
import com.petcare.app.ui.theme.PetCareTealSoft

private val categoriaOptions = listOf("paseador", "guarderia", "peluqueria")
private val diaSemanaOptions = listOf(
    "lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"
)

private data class DisponibilidadFormItem(
    val key: Int,
    val diaSemana: String = "",
    val horaInicio: String = "",
    val horaFin: String = ""
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ServicioFormScreen(
    categoriasAprobadas: List<String>,
    servicio: ServicioResponse?,
    isSaving: Boolean,
    saveError: String?,
    onSave: (String, String?, List<DisponibilidadRequest>) -> Unit,
    onCancel: () -> Unit
) {
    var categoria by rememberSaveable { mutableStateOf(servicio?.categoria.orEmpty()) }
    var descripcion by rememberSaveable { mutableStateOf(servicio?.descripcion.orEmpty()) }
    var nextKey by remember { mutableIntStateOf(0) }
    var disponibilidades by remember {
        mutableStateOf(
            servicio?.disponibilidades?.map {
                DisponibilidadFormItem(
                    key = nextKey++,
                    diaSemana = it.diaSemana,
                    horaInicio = it.horaInicio.take(5),
                    horaFin = it.horaFin.take(5)
                )
            } ?: listOf(DisponibilidadFormItem(key = nextKey++))
        )
    }
    var validation by remember { mutableStateOf(ServicioValidationResult()) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        EncabezadoFormulario(
            titulo = if (servicio == null) "Publicar servicio" else "Editar servicio",
            subtitulo = "Categoría y horarios de atención",
            onBack = onCancel,
            enabled = !isSaving
        )

        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            SeccionFormulario(
                titulo = "Categoría",
                iconRes = R.drawable.ic_services,
                descripcion = if (servicio == null) {
                    "Solo las categorías que ya te aprobaron."
                } else {
                    "La categoría no se puede cambiar al editar."
                }
            ) {
                val disponibles = categoriaOptions.filter { it in categoriasAprobadas }
                if (disponibles.isEmpty()) {
                    AvisoFormulario(
                        texto = "Todavía no tenés ninguna categoría aprobada. " +
                            "Pedí la aprobación desde Mis servicios.",
                        esError = false
                    )
                } else {
                    GrupoChips(
                        opciones = disponibles.map { it to categoriaLabel(it) },
                        seleccionado = categoria.ifBlank { null },
                        enabled = !isSaving && servicio == null,
                        isError = validation.categoriaError != null,
                        onSelect = { categoria = it }
                    )
                }
                validation.categoriaError?.let {
                    Text(
                        text = it,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }

            SeccionFormulario(
                titulo = "Descripción",
                iconRes = R.drawable.ic_edit,
                descripcion = "Opcional. Contá qué incluye y tu experiencia."
            ) {
                OutlinedTextField(
                    value = descripcion,
                    onValueChange = { descripcion = it },
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 110.dp),
                    label = { Text("Descripción") }
                )
            }

            SeccionFormulario(
                titulo = "Disponibilidad semanal",
                iconRes = R.drawable.ic_calendar,
                descripcion = "Los días y horarios en los que te pueden reservar."
            ) {
                disponibilidades.forEachIndexed { index, item ->
                    DisponibilidadFormRow(
                        item = item,
                        enabled = !isSaving,
                        canRemove = disponibilidades.size > 1,
                        onChange = { updated ->
                            disponibilidades = disponibilidades.toMutableList().also {
                                it[index] = updated
                            }
                        },
                        onRemove = {
                            disponibilidades = disponibilidades.toMutableList().also {
                                it.removeAt(index)
                            }
                        }
                    )
                }

                OutlinedButton(
                    onClick = {
                        disponibilidades = disponibilidades + DisponibilidadFormItem(key = nextKey++)
                    },
                    enabled = !isSaving,
                    modifier = Modifier.fillMaxWidth(),
                    shape = MaterialTheme.shapes.large
                ) {
                    Text("+ Agregar horario")
                }

                validation.disponibilidadesError?.let {
                    Text(
                        text = it,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        }

        BarraAccionFormulario(
            texto = "Guardar servicio",
            isLoading = isSaving,
            enabled = categoria in categoriasAprobadas,
            aviso = saveError,
            onClick = {
                val requestDisponibilidades = disponibilidades.map {
                    DisponibilidadRequest(
                        diaSemana = it.diaSemana,
                        horaInicio = it.horaInicio,
                        horaFin = it.horaFin
                    )
                }
                val nextValidation = ServicioValidator.validate(categoria, requestDisponibilidades)
                validation = nextValidation

                if (nextValidation.isValid && categoria in categoriasAprobadas) {
                    onSave(categoria, descripcion.trim().ifBlank { null }, requestDisponibilidades)
                }
            }
        )
    }
}

@Composable
private fun DisponibilidadFormRow(
    item: DisponibilidadFormItem,
    enabled: Boolean,
    canRemove: Boolean,
    onChange: (DisponibilidadFormItem) -> Unit,
    onRemove: () -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = PetCareSurfaceSoft,
        shape = MaterialTheme.shapes.large,
        border = BorderStroke(1.dp, PetCareLine)
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                CampoSeleccion(
                    label = "Día",
                    valor = item.diaSemana,
                    placeholder = "Seleccionar día",
                    opciones = diaSemanaOptions,
                    etiqueta = ::diaLabel,
                    enabled = enabled,
                    onSelect = { onChange(item.copy(diaSemana = it)) },
                    modifier = Modifier.weight(1f)
                )

                if (canRemove) {
                    IconButton(onClick = onRemove, enabled = enabled) {
                        Icon(
                            painter = painterResource(R.drawable.ic_delete),
                            contentDescription = "Quitar horario",
                            tint = MaterialTheme.colorScheme.error
                        )
                    }
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                TimeField(
                    label = "Desde",
                    value = item.horaInicio,
                    modifier = Modifier.weight(1f),
                    enabled = enabled,
                    onTimeSelected = { onChange(item.copy(horaInicio = it)) }
                )
                TimeField(
                    label = "Hasta",
                    value = item.horaFin,
                    modifier = Modifier.weight(1f),
                    enabled = enabled,
                    onTimeSelected = { onChange(item.copy(horaFin = it)) }
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TimeField(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
    enabled: Boolean,
    onTimeSelected: (String) -> Unit
) {
    var showPicker by remember { mutableStateOf(false) }
    val (initialHour, initialMinute) = value.toHourMinute()
    val timePickerState = rememberTimePickerState(
        initialHour = initialHour,
        initialMinute = initialMinute,
        is24Hour = true
    )

    CampoToque(
        label = label,
        valor = value,
        placeholder = "--:--",
        onClick = { showPicker = true },
        modifier = modifier,
        enabled = enabled,
        iconRes = R.drawable.ic_clock
    )

    if (showPicker) {
        Dialog(onDismissRequest = { showPicker = false }) {
            Surface(shape = MaterialTheme.shapes.extraLarge, color = MaterialTheme.colorScheme.surface) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    TimePicker(state = timePickerState)
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                        TextButton(onClick = { showPicker = false }) { Text("Cancelar") }
                        TextButton(onClick = {
                            onTimeSelected("%02d:%02d".format(timePickerState.hour, timePickerState.minute))
                            showPicker = false
                        }) { Text("Aceptar") }
                    }
                }
            }
        }
    }
}

private fun String.toHourMinute(): Pair<Int, Int> {
    val parts = takeIf { it.isNotBlank() }?.split(":")
    val hour = parts?.getOrNull(0)?.toIntOrNull() ?: 9
    val minute = parts?.getOrNull(1)?.toIntOrNull() ?: 0
    return hour to minute
}
