package com.petcare.app.features.adopciones.ui

import android.net.Uri
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
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.petcare.app.features.pets.data.remote.PetResponse
import com.petcare.app.features.pets.ui.PetPhotoField
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMint
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.ui.theme.PetCareSurfaceSoft
import com.petcare.app.ui.theme.PetCareTeal
import com.petcare.app.ui.theme.PetCareTealDark
import com.petcare.app.ui.theme.PetCareTealSoft

private val TAMANOS = listOf("PEQUENO" to "Pequeño", "MEDIANO" to "Mediano", "GRANDE" to "Grande")

@Composable
fun PublicarAdopcionScreen(
    pets: List<PetResponse>,
    isPublishing: Boolean,
    errorMessage: String?,
    successMessage: String?,
    onPublish: (
        petId: Int,
        descripcion: String,
        tamano: String?,
        vacunado: Boolean,
        compatiblePerros: Boolean,
        compatibleGatos: Boolean,
        compatibleNinos: Boolean,
        necesitaPatio: Boolean,
        ubicacion: String?,
        fotoUri: Uri?
    ) -> Unit,
    onRegisterNewPet: () -> Unit,
    onBack: () -> Unit
) {
    var selectedPetId by rememberSaveable { mutableStateOf<Int?>(null) }
    var fotoUri by rememberSaveable { mutableStateOf<Uri?>(null) }
    var descripcion by rememberSaveable { mutableStateOf("") }
    var tamano by rememberSaveable { mutableStateOf<String?>(null) }
    var vacunado by rememberSaveable { mutableStateOf(false) }
    var compatiblePerros by rememberSaveable { mutableStateOf(false) }
    var compatibleGatos by rememberSaveable { mutableStateOf(false) }
    var compatibleNinos by rememberSaveable { mutableStateOf(false) }
    var necesitaPatio by rememberSaveable { mutableStateOf(false) }
    var ubicacion by rememberSaveable { mutableStateOf("") }
    var formError by rememberSaveable { mutableStateOf<String?>(null) }

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
            text = "Publicar en adopción",
            style = MaterialTheme.typography.headlineMedium
        )
        Text(
            text = "Elegí una de tus mascotas y contá por qué busca un nuevo hogar.",
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
            EmptyPetsCard(onRegisterNewPet = onRegisterNewPet)
        } else {
            Text(
                text = "Mascota a publicar",
                style = MaterialTheme.typography.titleSmall
            )
            Spacer(modifier = Modifier.height(8.dp))
            pets.forEach { pet ->
                SelectablePetCard(
                    pet = pet,
                    selected = pet.id == selectedPetId,
                    onClick = {
                        selectedPetId = pet.id
                        fotoUri = null
                        formError = null
                    }
                )
                Spacer(modifier = Modifier.height(8.dp))
            }

            OutlinedButton(
                onClick = onRegisterNewPet,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("+ Registrar nueva mascota")
            }

            val mascotaElegida = pets.firstOrNull { it.id == selectedPetId }
            val necesitaFoto = mascotaElegida != null && mascotaElegida.foto.isNullOrBlank()

            if (necesitaFoto) {
                Spacer(modifier = Modifier.height(20.dp))

                Text(text = "Foto de la mascota", style = MaterialTheme.typography.titleSmall)
                Text(
                    text = "${mascotaElegida.nombre} todavía no tiene foto y hace falta una " +
                        "para publicarla. La foto queda guardada en su perfil.",
                    color = PetCareMuted,
                    style = MaterialTheme.typography.bodySmall
                )
                Spacer(modifier = Modifier.height(8.dp))
                PetPhotoField(
                    photoUri = fotoUri,
                    enabled = !isPublishing,
                    onPhotoAdjusted = {
                        fotoUri = it
                        formError = null
                    },
                    tituloSinFoto = "Foto obligatoria"
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            OutlinedTextField(
                value = descripcion,
                onValueChange = {
                    descripcion = it
                    formError = null
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(140.dp),
                label = { Text("Descripción o comentario") },
                enabled = !isPublishing,
                singleLine = false
            )

            Spacer(modifier = Modifier.height(20.dp))

            Text(text = "Tamaño", style = MaterialTheme.typography.titleSmall)
            Spacer(modifier = Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                TAMANOS.forEach { (valor, etiqueta) ->
                    TamanoChip(
                        texto = etiqueta,
                        seleccionado = tamano == valor,
                        onClick = { tamano = if (tamano == valor) null else valor },
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text(text = "Características", style = MaterialTheme.typography.titleSmall)
            OpcionCheckbox("Vacunado/a", vacunado) { vacunado = it }
            OpcionCheckbox("Convive bien con perros", compatiblePerros) { compatiblePerros = it }
            OpcionCheckbox("Convive bien con gatos", compatibleGatos) { compatibleGatos = it }
            OpcionCheckbox("Convive bien con niños", compatibleNinos) { compatibleNinos = it }
            OpcionCheckbox("Necesita patio", necesitaPatio) { necesitaPatio = it }

            Spacer(modifier = Modifier.height(16.dp))

            OutlinedTextField(
                value = ubicacion,
                onValueChange = { ubicacion = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Ubicación (ej. Córdoba)") },
                enabled = !isPublishing,
                singleLine = true
            )

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
                    when {
                        petId == null ->
                            formError = "Elegí una mascota para publicar"
                        necesitaFoto && fotoUri == null ->
                            formError = "Agregá una foto de la mascota para publicarla"
                        descripcion.isBlank() ->
                            formError = "Agregá una descripción o comentario"
                        else -> onPublish(
                            petId,
                            descripcion.trim(),
                            tamano,
                            vacunado,
                            compatiblePerros,
                            compatibleGatos,
                            compatibleNinos,
                            necesitaPatio,
                            ubicacion.trim().ifBlank { null },
                            fotoUri
                        )
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                enabled = !isPublishing && !(necesitaFoto && fotoUri == null),
                shape = MaterialTheme.shapes.large
            ) {
                if (isPublishing) {
                    CircularProgressIndicator(
                        modifier = Modifier.height(22.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Text("Publicar en adopción")
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        TextButton(
            onClick = onBack,
            enabled = !isPublishing,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Cancelar")
        }
    }
}

@Composable
private fun OpcionCheckbox(texto: String, valor: Boolean, onChange: (Boolean) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onChange(!valor) },
        verticalAlignment = Alignment.CenterVertically
    ) {
        Checkbox(checked = valor, onCheckedChange = onChange)
        Text(text = texto, style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
private fun TamanoChip(
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
                .padding(vertical = 10.dp),
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            color = if (seleccionado) androidx.compose.ui.graphics.Color.White else PetCareTealDark,
            style = MaterialTheme.typography.labelLarge
        )
    }
}

@Composable
private fun SelectablePetCard(
    pet: PetResponse,
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
        border = BorderStroke(
            1.dp,
            if (selected) PetCareTeal else PetCareLine
        ),
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
                Text(
                    text = pet.nombre,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = listOfNotNull(pet.especie, pet.raza).joinToString(" · "),
                    color = PetCareMuted,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
            if (selected) {
                Text(
                    text = "Seleccionada",
                    color = PetCareTeal,
                    style = MaterialTheme.typography.labelLarge
                )
            }
        }
    }
}

@Composable
private fun EmptyPetsCard(onRegisterNewPet: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = PetCareMint),
        border = BorderStroke(1.dp, PetCareLine),
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            horizontalAlignment = Alignment.Start
        ) {
            Text(
                text = "Todavía no tenés mascotas registradas",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = "Registrá una mascota para poder publicarla en adopción.",
                color = PetCareMuted,
                style = MaterialTheme.typography.bodyMedium
            )
            Spacer(modifier = Modifier.height(16.dp))
            Button(
                onClick = onRegisterNewPet,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = MaterialTheme.shapes.large
            ) {
                Text("Registrar nueva mascota")
            }
        }
    }
}
