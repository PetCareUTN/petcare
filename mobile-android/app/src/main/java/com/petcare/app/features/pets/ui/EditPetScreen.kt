package com.petcare.app.features.pets.ui

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
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
import com.petcare.app.features.pets.data.remote.PetResponse
import com.petcare.app.features.pets.data.remote.UpdatePetRequest
import com.petcare.app.features.pets.domain.PetRegistrationValidationResult
import com.petcare.app.features.pets.domain.PetRegistrationValidator

@Composable
fun EditPetScreen(
    pet: PetResponse,
    isSaving: Boolean,
    saveError: String?,
    onSave: (UpdatePetRequest, Uri?) -> Unit,
    onCancel: () -> Unit
) {
    var name by rememberSaveable { mutableStateOf(pet.nombre) }
    var species by rememberSaveable { mutableStateOf(pet.especie) }
    var breed by rememberSaveable { mutableStateOf(pet.raza ?: "") }
    var sex by rememberSaveable { mutableStateOf(pet.sexo) }
    var birthDate by rememberSaveable { mutableStateOf(pet.birthDate ?: "") }
    var weight by rememberSaveable { mutableStateOf(pet.peso?.toString() ?: "") }
    var isSterilized by rememberSaveable { mutableStateOf(pet.esterilizado) }
    var observations by rememberSaveable { mutableStateOf(pet.observaciones ?: "") }
    var allergies by rememberSaveable { mutableStateOf(pet.alergias ?: "") }
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
            .systemBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        verticalArrangement = Arrangement.Top,
        horizontalAlignment = Alignment.Start
    ) {
        Text(
            text = "Editar mascota",
            style = MaterialTheme.typography.headlineMedium
        )

        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
            value = name,
            onValueChange = { name = it.take(100) },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Nombre") },
            isError = validation.nameError != null,
            supportingText = validation.nameError?.let { { Text(it) } },
            singleLine = true
        )

        OutlinedTextField(
            value = species,
            onValueChange = { species = it.take(50) },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Especie") },
            isError = validation.speciesError != null,
            supportingText = validation.speciesError?.let { { Text(it) } },
            singleLine = true
        )

        OutlinedTextField(
            value = breed,
            onValueChange = { breed = it.take(80) },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Raza") },
            singleLine = true
        )

        Text(
            text = "Sexo",
            modifier = Modifier.padding(top = 8.dp),
            style = MaterialTheme.typography.bodyMedium
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 8.dp),
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
                modifier = Modifier.padding(top = 4.dp),
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall
            )
        }

        OutlinedTextField(
            value = birthDate,
            onValueChange = { birthDate = it.take(10) },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Fecha de nacimiento") },
            placeholder = { Text("AAAA-MM-DD") },
            isError = validation.birthDateError != null,
            supportingText = validation.birthDateError?.let { { Text(it) } },
            singleLine = true
        )

        OutlinedTextField(
            value = weight,
            onValueChange = { weight = it.take(20) },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Peso") },
            isError = validation.weightError != null,
            supportingText = validation.weightError?.let { { Text(it) } },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            singleLine = true
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Checkbox(
                checked = isSterilized,
                onCheckedChange = { isSterilized = it }
            )
            Text("Esterilizado")
        }

        OutlinedTextField(
            value = allergies,
            onValueChange = { allergies = it.take(250) },
            modifier = Modifier
                .fillMaxWidth()
                .height(100.dp),
            label = { Text("Alergias") }
        )

        OutlinedTextField(
            value = observations,
            onValueChange = { observations = it.take(250) },
            modifier = Modifier
                .fillMaxWidth()
                .height(120.dp),
            label = { Text("Observaciones") }
        )

        OutlinedButton(
            onClick = { photoPicker.launch("image/*") },
            enabled = !isSaving,
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 12.dp)
        ) {
            Text("Cambiar foto")
        }

        photoUri?.let {
            Text(
                text = "Foto seleccionada",
                modifier = Modifier.padding(top = 4.dp),
                style = MaterialTheme.typography.bodySmall
            )
        }

        saveError?.let {
            Text(
                text = it,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp),
                color = MaterialTheme.colorScheme.error
            )
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

                if (nextValidation.isValid) {
                    onSave(
                        UpdatePetRequest(
                            nombre = name.trim(),
                            especie = species.trim(),
                            raza = breed.trim().ifBlank { null },
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
                .padding(top = 16.dp)
        ) {
            Text(if (isSaving) "Guardando..." else "Guardar cambios")
        }

        OutlinedButton(
            onClick = onCancel,
            enabled = !isSaving,
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 8.dp)
        ) {
            Text("Cancelar")
        }
    }
}
