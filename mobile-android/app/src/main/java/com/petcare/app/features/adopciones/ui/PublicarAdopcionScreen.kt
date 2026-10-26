package com.petcare.app.features.adopciones.ui

import com.petcare.app.ui.components.LocalEspacioBarraInferior
import com.petcare.app.ui.components.elevacionTarjeta
import com.petcare.app.ui.components.elevacionBoton
import android.net.Uri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
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
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.petcare.app.R
import com.petcare.app.features.pets.data.remote.PetResponse
import com.petcare.app.features.pets.ui.PetAvatar
import com.petcare.app.features.pets.ui.PetPhotoField
import com.petcare.app.ui.components.AvisoFormulario
import com.petcare.app.ui.components.BarraAccionFormulario
import com.petcare.app.ui.components.EncabezadoFormulario
import com.petcare.app.ui.components.FilaInterruptor
import com.petcare.app.ui.components.GrupoChips
import com.petcare.app.ui.components.SeccionFormulario
import com.petcare.app.ui.components.SeparadorFila
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMint
import com.petcare.app.ui.theme.PetCareMuted
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
        provincia: String,
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
    var provincia by rememberSaveable { mutableStateOf<String?>(null) }
    var ubicacion by rememberSaveable { mutableStateOf("") }
    var formError by rememberSaveable { mutableStateOf<String?>(null) }

    val mascotaElegida = pets.firstOrNull { it.id == selectedPetId }
    val necesitaFoto = mascotaElegida != null && mascotaElegida.foto.isNullOrBlank()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        EncabezadoFormulario(
            titulo = "Publicar en adopción",
            subtitulo = "Ayudá a que encuentre un nuevo hogar",
            onBack = onBack,
            enabled = !isPublishing
        )

        if (successMessage != null) {
            PublicacionExitosa(mensaje = successMessage, onVolver = onBack)
            return@Column
        }

        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 12.dp)
                .padding(bottom = LocalEspacioBarraInferior.current),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            if (pets.isEmpty()) {
                EmptyPetsCard(onRegisterNewPet = onRegisterNewPet)
            } else {
                SeccionFormulario(
                    titulo = "¿A quién querés publicar?",
                    iconRes = R.drawable.ic_paw
                ) {
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
                    }
                    TextButton(
                        onClick = onRegisterNewPet,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("+ Registrar nueva mascota", color = PetCareTealDark)
                    }
                }

                if (necesitaFoto && mascotaElegida != null) {
                    SeccionFormulario(
                        titulo = "Foto de ${mascotaElegida.nombre}",
                        iconRes = R.drawable.ic_info,
                        descripcion = "Hace falta una foto para publicarla. " +
                            "También queda en su perfil."
                    ) {
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
                }

                SeccionFormulario(
                    titulo = "Sobre la mascota",
                    iconRes = R.drawable.ic_edit
                ) {
                    OutlinedTextField(
                        value = descripcion,
                        onValueChange = {
                            descripcion = it
                            formError = null
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(min = 120.dp),
                        label = { Text("Contá cómo es y por qué busca hogar") },
                        enabled = !isPublishing,
                        singleLine = false
                    )

                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(text = "Tamaño", style = MaterialTheme.typography.labelLarge)
                        GrupoChips(
                            opciones = TAMANOS,
                            seleccionado = tamano,
                            enabled = !isPublishing,
                            onSelect = { tamano = if (tamano == it) null else it }
                        )
                    }
                }

                SeccionFormulario(
                    titulo = "Características",
                    iconRes = R.drawable.ic_check,
                    descripcion = "Activá las que correspondan."
                ) {
                    FilaInterruptor("Vacunado/a", vacunado, { vacunado = it }, enabled = !isPublishing)
                    SeparadorFila()
                    FilaInterruptor(
                        "Convive bien con perros",
                        compatiblePerros,
                        { compatiblePerros = it },
                        enabled = !isPublishing
                    )
                    SeparadorFila()
                    FilaInterruptor(
                        "Convive bien con gatos",
                        compatibleGatos,
                        { compatibleGatos = it },
                        enabled = !isPublishing
                    )
                    SeparadorFila()
                    FilaInterruptor(
                        "Convive bien con niños",
                        compatibleNinos,
                        { compatibleNinos = it },
                        enabled = !isPublishing
                    )
                    SeparadorFila()
                    FilaInterruptor(
                        "Necesita patio",
                        necesitaPatio,
                        { necesitaPatio = it },
                        enabled = !isPublishing
                    )
                }

                SeccionFormulario(
                    titulo = "¿Dónde está?",
                    iconRes = R.drawable.ic_location,
                    descripcion = "Para que lo encuentre quien vive cerca."
                ) {
                    SelectorProvincia(
                        provincia = provincia,
                        textoSinSeleccion = "Elegí la provincia",
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !isPublishing
                    ) { provincia = it }

                    OutlinedTextField(
                        value = ubicacion,
                        onValueChange = { ubicacion = it },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Barrio o ciudad (opcional)") },
                        enabled = !isPublishing,
                        singleLine = true
                    )
                }
            }
        }

        if (pets.isNotEmpty()) {
            BarraAccionFormulario(
                texto = "Publicar en adopción",
                isLoading = isPublishing,
                enabled = !(necesitaFoto && fotoUri == null),
                aviso = formError ?: errorMessage,
                onClick = {
                    val petId = selectedPetId
                    when {
                        petId == null ->
                            formError = "Elegí una mascota para publicar"
                        necesitaFoto && fotoUri == null ->
                            formError = "Agregá una foto de la mascota para publicarla"
                        descripcion.isBlank() ->
                            formError = "Agregá una descripción o comentario"
                        provincia == null ->
                            formError = "Elegí la provincia donde está la mascota"
                        else -> onPublish(
                            petId,
                            descripcion.trim(),
                            tamano,
                            vacunado,
                            compatiblePerros,
                            compatibleGatos,
                            compatibleNinos,
                            necesitaPatio,
                            provincia!!,
                            ubicacion.trim().ifBlank { null },
                            fotoUri
                        )
                    }
                }
            )
        }
    }
}

/** Confirmación al publicar: un cierre claro en vez de un texto suelto. */
@Composable
private fun PublicacionExitosa(mensaje: String, onVolver: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(28.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Surface(
            modifier = Modifier.size(96.dp),
            shape = CircleShape,
            color = PetCareTealSoft
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    painter = painterResource(R.drawable.ic_check),
                    contentDescription = null,
                    tint = PetCareTeal,
                    modifier = Modifier.size(48.dp)
                )
            }
        }
        Spacer(modifier = Modifier.height(20.dp))
        Text(
            text = "¡Publicación creada!",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = mensaje,
            color = PetCareMuted,
            style = MaterialTheme.typography.bodyLarge,
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(28.dp))
        Button(
            elevation = elevacionBoton(),
            onClick = onVolver,
            modifier = Modifier
                .fillMaxWidth()
                .height(54.dp),
            shape = MaterialTheme.shapes.large
        ) {
            Text("Volver")
        }
    }
}

@Composable
private fun SelectablePetCard(
    pet: PetResponse,
    selected: Boolean,
    onClick: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        color = if (selected) PetCareTealSoft else MaterialTheme.colorScheme.surface,
        border = BorderStroke(if (selected) 2.dp else 1.dp, if (selected) PetCareTeal else PetCareLine),
        shape = MaterialTheme.shapes.large
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            PetAvatar(
                petName = pet.nombre,
                photoPath = pet.foto,
                modifier = Modifier.size(48.dp),
                textStyle = MaterialTheme.typography.titleMedium
            )
            Column(modifier = Modifier.weight(1f)) {
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
                Surface(
                    modifier = Modifier.size(26.dp),
                    shape = CircleShape,
                    color = PetCareTeal
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            painter = painterResource(R.drawable.ic_check),
                            contentDescription = "Seleccionada",
                            tint = androidx.compose.ui.graphics.Color.White,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun EmptyPetsCard(onRegisterNewPet: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = elevacionTarjeta(),
        colors = CardDefaults.cardColors(containerColor = PetCareMint),
        border = BorderStroke(1.dp, PetCareLine),
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(22.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Surface(
                modifier = Modifier.size(72.dp),
                shape = CircleShape,
                color = PetCareTealSoft
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        painter = painterResource(R.drawable.ic_paw),
                        contentDescription = null,
                        tint = PetCareTeal,
                        modifier = Modifier.size(34.dp)
                    )
                }
            }
            Spacer(modifier = Modifier.height(14.dp))
            Text(
                text = "Todavía no tenés mascotas registradas",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = "Registrá una mascota para poder publicarla en adopción.",
                color = PetCareMuted,
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(18.dp))
            Button(
                elevation = elevacionBoton(),
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
