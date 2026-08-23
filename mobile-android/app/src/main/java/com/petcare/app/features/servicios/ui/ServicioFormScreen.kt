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
            .systemBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.Top,
        horizontalAlignment = Alignment.Start
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onCancel, enabled = !isSaving) {
                Icon(
                    painter = painterResource(R.drawable.ic_arrow_back),
                    contentDescription = "Volver",
                    tint = PetCareTealDark
                )
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = if (servicio == null) "Publicar servicio" else "Editar servicio",
                    style = MaterialTheme.typography.headlineSmall
                )
                Text(
                    text = "Categoria y disponibilidad semanal",
                    color = PetCareMuted,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }

        Spacer(modifier = Modifier.height(18.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = BorderStroke(1.dp, PetCareLine),
            shape = MaterialTheme.shapes.extraLarge
        ) {
            Column(
                modifier = Modifier.padding(18.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                EnumDropdownField(
                    label = "Categoria",
                    selectedValue = categoria,
                    placeholder = "Seleccionar categoria",
                    options = categoriaOptions,
                    optionLabel = ::categoriaLabel,
                    enabled = !isSaving,
                    isError = validation.categoriaError != null,
                    supportingText = validation.categoriaError,
                    onSelect = { categoria = it }
                )

                OutlinedTextField(
                    value = descripcion,
                    onValueChange = { descripcion = it },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(120.dp),
                    label = { Text("Descripcion (opcional)") }
                )

                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(text = "Disponibilidad semanal", style = MaterialTheme.typography.labelLarge)

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
                        Text("+ Agregar disponibilidad")
                    }

                    validation.disponibilidadesError?.let {
                        Text(
                            text = it,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }

                saveError?.let {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        color = PetCareTealSoft,
                        shape = MaterialTheme.shapes.medium
                    ) {
                        Text(
                            text = it,
                            modifier = Modifier.padding(12.dp),
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            }
        }

        Button(
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

                if (nextValidation.isValid) {
                    onSave(categoria, descripcion.trim().ifBlank { null }, requestDisponibilidades)
                }
            },
            enabled = !isSaving,
            modifier = Modifier
                .fillMaxWidth()
                .height(54.dp)
                .padding(top = 14.dp),
            shape = MaterialTheme.shapes.large
        ) {
            Text(if (isSaving) "Guardando..." else "Guardar servicio")
        }

        Spacer(modifier = Modifier.height(16.dp))
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
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        shape = MaterialTheme.shapes.large
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                EnumDropdownField(
                    label = "Dia",
                    selectedValue = item.diaSemana,
                    placeholder = "Seleccionar dia",
                    options = diaSemanaOptions,
                    optionLabel = ::diaLabel,
                    enabled = enabled,
                    onSelect = { onChange(item.copy(diaSemana = it)) },
                    modifier = Modifier.weight(1f)
                )

                if (canRemove) {
                    TextButton(onClick = onRemove, enabled = enabled) {
                        Text("Quitar", color = MaterialTheme.colorScheme.error)
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

@Composable
private fun EnumDropdownField(
    label: String,
    selectedValue: String,
    placeholder: String,
    options: List<String>,
    optionLabel: (String) -> String,
    enabled: Boolean,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
    isError: Boolean = false,
    supportingText: String? = null
) {
    var expanded by remember { mutableStateOf(false) }

    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(text = label, style = MaterialTheme.typography.labelLarge)

        Box(modifier = Modifier.fillMaxWidth()) {
            OutlinedButton(
                onClick = { expanded = true },
                enabled = enabled,
                modifier = Modifier.fillMaxWidth(),
                shape = MaterialTheme.shapes.large,
                border = BorderStroke(
                    1.dp,
                    if (isError) MaterialTheme.colorScheme.error else PetCareLine
                )
            ) {
                Text(
                    text = if (selectedValue.isBlank()) placeholder else optionLabel(selectedValue),
                    color = if (selectedValue.isBlank()) PetCareMuted else MaterialTheme.colorScheme.onSurface
                )
            }

            DropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false },
                modifier = Modifier.fillMaxWidth()
            ) {
                options.forEach { option ->
                    DropdownMenuItem(
                        text = { Text(optionLabel(option)) },
                        onClick = {
                            onSelect(option)
                            expanded = false
                        }
                    )
                }
            }
        }

        supportingText?.let {
            Text(text = it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
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

    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(text = label, style = MaterialTheme.typography.labelLarge)
        OutlinedButton(
            onClick = { showPicker = true },
            enabled = enabled,
            modifier = Modifier.fillMaxWidth(),
            shape = MaterialTheme.shapes.large
        ) {
            Text(text = value.ifBlank { "--:--" })
        }
    }

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
