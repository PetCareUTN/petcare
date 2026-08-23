package com.petcare.app.features.pets.ui

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import com.petcare.app.features.pets.data.remote.CreatePetRequest
import com.petcare.app.features.pets.domain.PetRegistrationValidationResult
import com.petcare.app.features.pets.domain.PetRegistrationValidator
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMint
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
    val photoPicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        photoUriText = uri?.toString()
    }

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
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "Nueva mascota",
                    style = MaterialTheme.typography.headlineMedium
                )
                Text(
                    text = "Datos basicos del perfil",
                    color = PetCareMuted,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
            OutlinedButton(
                onClick = onCancel,
                enabled = !isSaving,
                shape = MaterialTheme.shapes.large
            ) {
                Text("Cerrar")
            }
        }

        Spacer(modifier = Modifier.height(18.dp))

        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = PetCareTealSoft,
            shape = MaterialTheme.shapes.extraLarge
        ) {
            Text(
                text = "La mascota queda asociada automaticamente a tu sesion.",
                modifier = Modifier.padding(16.dp),
                color = PetCareTealDark,
                style = MaterialTheme.typography.bodyMedium
            )
        }

        Spacer(modifier = Modifier.height(14.dp))

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
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Nombre") },
                    isError = validation.nameError != null,
                    supportingText = validation.nameError?.let { { Text(it) } },
                    singleLine = true
                )

                PetDropdownField(
                    label = "Especie",
                    selectedValue = species,
                    placeholder = "Seleccionar especie",
                    options = speciesOptions,
                    enabled = !isSaving,
                    isError = validation.speciesError != null,
                    supportingText = validation.speciesError,
                    onSelect = {
                        species = it
                        breed = ""
                        customBreed = ""
                        customBreedError = null
                    }
                )

                PetDropdownField(
                    label = "Raza",
                    selectedValue = breed,
                    placeholder = "Seleccionar raza",
                    options = breedOptions,
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
                    Text(
                        text = "Sexo",
                        style = MaterialTheme.typography.labelLarge
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        FilterChip(
                            selected = sex == "macho",
                            onClick = { sex = "macho" },
                            label = { Text("Macho") }
                        )
                        FilterChip(
                            selected = sex == "hembra",
                            onClick = { sex = "hembra" },
                            label = { Text("Hembra") }
                        )
                    }

                    validation.sexError?.let {
                        Text(
                            text = it,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }

                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    BirthDatePickerField(
                        selectedDate = birthDate,
                        modifier = Modifier.weight(1f),
                        enabled = !isSaving,
                        isError = validation.birthDateError != null,
                        supportingText = validation.birthDateError,
                        onDateSelected = { birthDate = it }
                    )

                    Row(
                        modifier = Modifier.weight(1f),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedTextField(
                            value = weight,
                            onValueChange = { weight = it },
                            modifier = Modifier.weight(1f),
                            label = { Text("Peso") },
                            isError = validation.weightError != null,
                            supportingText = validation.weightError?.let { { Text(it) } },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            singleLine = true
                        )
                        Text(
                            text = "kg",
                            color = PetCareMuted,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }

                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = PetCareSurfaceSoft,
                    shape = MaterialTheme.shapes.large
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Checkbox(
                            checked = isSterilized,
                            onCheckedChange = { isSterilized = it }
                        )
                        Text(
                            text = "Esterilizado",
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }

                OutlinedTextField(
                    value = allergies,
                    onValueChange = { allergies = it },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(100.dp),
                    label = { Text("Alergias") }
                )

                OutlinedTextField(
                    value = observations,
                    onValueChange = { observations = it },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(120.dp),
                    label = { Text("Observaciones") }
                )

                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = PetCareMint,
                    shape = MaterialTheme.shapes.extraLarge,
                    border = BorderStroke(1.dp, PetCareLine)
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = if (photoUri == null) "Foto opcional" else "Foto seleccionada",
                                style = MaterialTheme.typography.titleMedium
                            )
                            Text(
                                text = if (photoUri == null) {
                                    "JPG, PNG o WEBP hasta 2 MB"
                                } else {
                                    "Se enviara junto con el alta"
                                },
                                color = PetCareMuted,
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }
                        OutlinedButton(
                            onClick = { photoPicker.launch("image/*") },
                            enabled = !isSaving,
                            shape = MaterialTheme.shapes.large
                        ) {
                            Text(if (photoUri == null) "Elegir" else "Cambiar")
                        }
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
            },
            enabled = !isSaving,
            modifier = Modifier
                .fillMaxWidth()
                .height(54.dp)
                .padding(top = 14.dp),
            shape = MaterialTheme.shapes.large
        ) {
            Text(if (isSaving) "Guardando..." else "Guardar mascota")
        }

        Spacer(modifier = Modifier.height(16.dp))
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

    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Text(
            text = "Nacimiento",
            style = MaterialTheme.typography.labelLarge
        )

        OutlinedButton(
            onClick = { showPicker = true },
            enabled = enabled,
            modifier = Modifier.fillMaxWidth(),
            shape = MaterialTheme.shapes.large,
            border = BorderStroke(
                1.dp,
                if (isError) MaterialTheme.colorScheme.error else PetCareLine
            )
        ) {
            Text(
                text = selectedDate.ifBlank { "Seleccionar fecha" },
                color = if (selectedDate.isBlank()) PetCareMuted else MaterialTheme.colorScheme.onSurface
            )
        }

        supportingText?.let {
            Text(
                text = it,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall
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

@Composable
private fun PetDropdownField(
    label: String,
    selectedValue: String,
    placeholder: String,
    options: List<String>,
    enabled: Boolean,
    onSelect: (String) -> Unit,
    isError: Boolean = false,
    supportingText: String? = null
) {
    var expanded by remember { mutableStateOf(false) }

    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelLarge
        )

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
                    text = selectedValue.ifBlank { placeholder },
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
                        text = { Text(option) },
                        onClick = {
                            onSelect(option)
                            expanded = false
                        }
                    )
                }
            }
        }

        supportingText?.let {
            Text(
                text = it,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall
            )
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
