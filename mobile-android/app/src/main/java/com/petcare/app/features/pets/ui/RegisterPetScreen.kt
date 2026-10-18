package com.petcare.app.features.pets.ui

import android.net.Uri
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
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.petcare.app.R
import com.petcare.app.features.pets.data.remote.CreatePetRequest
import com.petcare.app.features.pets.domain.PetRegistrationValidationResult
import com.petcare.app.features.pets.domain.PetRegistrationValidator
import com.petcare.app.ui.components.BarraAccionFormulario
import com.petcare.app.ui.components.CampoSeleccion
import com.petcare.app.ui.components.CampoToque
import com.petcare.app.ui.components.EncabezadoFormulario
import com.petcare.app.ui.components.FilaInterruptor
import com.petcare.app.ui.components.GrupoChips
import com.petcare.app.ui.components.SeccionFormulario
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.ui.theme.PetCareSurfaceSoft
import com.petcare.app.ui.theme.PetCareTealDark
import com.petcare.app.ui.theme.PetCareTealSoft
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

private val breedOptionsBySpecies = mapOf(
    "Perro" to listOf(
        "Mestizo",
        "Labrador Retriever",
        "Golden Retriever",
        "Caniche",
        "Bulldog Frances",
        "Pastor Aleman",
        "Beagle",
        "Boxer",
        "Chihuahua",
        "Dachshund",
        "Shih Tzu",
        "Yorkshire Terrier",
        "Otro"
    ),
    "Gato" to listOf(
        "Mestizo",
        "Siames",
        "Persa",
        "Maine Coon",
        "Bengala",
        "Ragdoll",
        "Sphynx",
        "British Shorthair",
        "Angora",
        "Otro"
    )
)

private val speciesOptions = breedOptionsBySpecies.keys.toList()

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RegisterPetScreen(
    isSaving: Boolean,
    saveError: String?,
    onSave: (CreatePetRequest, Uri?) -> Unit,
    onCancel: () -> Unit
) {
    var name by rememberSaveable { mutableStateOf("") }
    var species by rememberSaveable { mutableStateOf("") }
    var breed by rememberSaveable { mutableStateOf("") }
    var customBreed by rememberSaveable { mutableStateOf("") }
    var customBreedError by rememberSaveable { mutableStateOf<String?>(null) }
    var sex by rememberSaveable { mutableStateOf("") }
    var birthDate by rememberSaveable { mutableStateOf("") }
    var weight by rememberSaveable { mutableStateOf("") }
    var isSterilized by rememberSaveable { mutableStateOf(false) }
    var observations by rememberSaveable { mutableStateOf("") }
    var allergies by rememberSaveable { mutableStateOf("") }
    val breedOptions = breedOptionsBySpecies[species].orEmpty()
    var photoUriText by rememberSaveable { mutableStateOf<String?>(null) }
    var validation by remember {
        mutableStateOf(PetRegistrationValidationResult())
    }
    val photoUri = photoUriText?.let(Uri::parse)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        EncabezadoFormulario(
            titulo = "Nueva mascota",
            subtitulo = "Contanos sobre tu compañero",
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
                titulo = "Datos básicos",
                iconRes = R.drawable.ic_person
            ) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Nombre") },
                    isError = validation.nameError != null,
                    supportingText = validation.nameError?.let { { Text(it) } },
                    singleLine = true
                )

                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(text = "Especie", style = MaterialTheme.typography.labelLarge)
                    GrupoChips(
                        opciones = speciesOptions.map { it to it },
                        seleccionado = species.ifBlank { null },
                        enabled = !isSaving,
                        isError = validation.speciesError != null,
                        onSelect = {
                            species = it
                            breed = ""
                            customBreed = ""
                            customBreedError = null
                        }
                    )
                    validation.speciesError?.let {
                        Text(
                            text = it,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }

                CampoSeleccion(
                    label = "Raza",
                    valor = breed,
                    placeholder = if (species.isBlank()) "Elegí primero la especie" else "Seleccionar raza",
                    opciones = breedOptions,
                    enabled = !isSaving && species.isNotBlank(),
                    onSelect = {
                        breed = it
                        if (it != "Otro") {
                            customBreed = ""
                            customBreedError = null
                        }
                    }
                )

                if (breed == "Otro") {
                    OutlinedTextField(
                        value = customBreed,
                        onValueChange = {
                            customBreed = it
                            customBreedError = null
                        },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Especificá la raza") },
                        isError = customBreedError != null,
                        supportingText = customBreedError?.let { { Text(it) } },
                        singleLine = true
                    )
                }

                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(text = "Sexo", style = MaterialTheme.typography.labelLarge)
                    GrupoChips(
                        opciones = listOf("macho" to "Macho", "hembra" to "Hembra"),
                        seleccionado = sex.ifBlank { null },
                        enabled = !isSaving,
                        isError = validation.sexError != null,
                        onSelect = { sex = it }
                    )
                    validation.sexError?.let {
                        Text(
                            text = it,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }
            }

            SeccionFormulario(
                titulo = "Foto",
                iconRes = R.drawable.ic_paw,
                descripcion = "Opcional. Ayuda a reconocerla en la app."
            ) {
                PetPhotoField(
                    photoUri = photoUri,
                    enabled = !isSaving,
                    onPhotoAdjusted = { photoUriText = it.toString() }
                )
            }

            SeccionFormulario(
                titulo = "Detalles",
                iconRes = R.drawable.ic_calendar
            ) {
                BirthDatePickerField(
                    selectedDate = birthDate,
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !isSaving,
                    isError = validation.birthDateError != null,
                    supportingText = validation.birthDateError,
                    onDateSelected = { birthDate = it }
                )

                OutlinedTextField(
                    value = weight,
                    onValueChange = { weight = normalizeWeightInput(it) },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Peso") },
                    placeholder = { Text("Ej.: 12,5") },
                    suffix = { Text("kg") },
                    isError = validation.weightError != null,
                    supportingText = validation.weightError?.let { { Text(it) } },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true
                )

                FilaInterruptor(
                    titulo = "Esterilizado/a",
                    checked = isSterilized,
                    onChange = { isSterilized = it },
                    enabled = !isSaving
                )
            }

            SeccionFormulario(
                titulo = "Salud",
                iconRes = R.drawable.ic_heart,
                descripcion = "Opcional. Podés completarlo más adelante."
            ) {
                OutlinedTextField(
                    value = allergies,
                    onValueChange = { allergies = it },
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 90.dp),
                    label = { Text("Alergias") }
                )

                OutlinedTextField(
                    value = observations,
                    onValueChange = { observations = it },
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 110.dp),
                    label = { Text("Observaciones") }
                )
            }
        }

        BarraAccionFormulario(
            texto = "Guardar mascota",
            isLoading = isSaving,
            aviso = saveError,
            onClick = {
                val nextValidation = PetRegistrationValidator.validate(
                    name = name,
                    species = species,
                    sex = sex,
                    birthDate = birthDate,
                    weight = weight
                )
                validation = nextValidation

                val isCustomBreedInvalid = breed == "Otro" && customBreed.isBlank()
                customBreedError = if (isCustomBreedInvalid) {
                    "Especificá la raza de la mascota."
                } else {
                    null
                }

                if (nextValidation.isValid && !isCustomBreedInvalid) {
                    val finalBreed = if (breed == "Otro") customBreed else breed
                    onSave(
                        CreatePetRequest(
                            nombre = name.trim(),
                            especie = species.trim(),
                            raza = finalBreed.trim().ifBlank { null },
                            sexo = sex,
                            birthDate = birthDate.trim().ifBlank { null },
                            peso = weight.trim().ifBlank { null }?.toDouble(),
                            esterilizado = isSterilized,
                            observaciones = observations.trim().ifBlank { null },
                            alergias = allergies.trim().ifBlank { null }
                        ),
                        photoUri
                    )
                }
            }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun BirthDatePickerField(
    selectedDate: String,
    modifier: Modifier = Modifier,
    enabled: Boolean,
    onDateSelected: (String) -> Unit,
    isError: Boolean = false,
    supportingText: String? = null
) {
    var showPicker by remember { mutableStateOf(false) }
    val datePickerState = rememberDatePickerState(
        initialSelectedDateMillis = selectedDate.toBirthDateMillis()
    )

    CampoToque(
        label = "Fecha de nacimiento",
        valor = selectedDate,
        placeholder = "Seleccionar fecha",
        onClick = { showPicker = true },
        modifier = modifier,
        enabled = enabled,
        isError = isError,
        supportingText = supportingText,
        iconRes = R.drawable.ic_calendar
    )

    if (showPicker) {
        DatePickerDialog(
            onDismissRequest = { showPicker = false },
            confirmButton = {
                TextButton(
                    onClick = {
                        datePickerState.selectedDateMillis?.let {
                            onDateSelected(it.toBirthDateText())
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

private fun Long.toBirthDateText(): String =
    birthDateFormatter().format(this)

private fun String.toBirthDateMillis(): Long? =
    takeIf { it.isNotBlank() }?.let {
        runCatching { birthDateFormatter().parse(it)?.time }.getOrNull()
    }

private fun birthDateFormatter(): SimpleDateFormat =
    SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }
