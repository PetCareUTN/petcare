package com.petcare.app.features.pets.ui

import com.petcare.app.ui.components.elevacionTarjeta
import com.petcare.app.ui.components.elevacionBoton
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.Box
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
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.petcare.app.R
import com.petcare.app.features.pets.data.remote.DuenoMascotaResponse
import com.petcare.app.features.pets.data.remote.PetResponse
import com.petcare.app.features.pets.data.remote.SolicitudCompartirResponse
import com.petcare.app.features.pets.data.remote.UsuarioEncontradoResponse
import com.petcare.app.features.pets.domain.MascotasCompartidasController
import com.petcare.app.ui.theme.PetCareError
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.ui.theme.PetCareSurfaceSoft
import com.petcare.app.ui.theme.PetCareTealDark
import com.petcare.app.ui.theme.PetCareTealSoft
import kotlinx.coroutines.launch

/**
 * Los dueños de una mascota y cómo compartirla con otra persona.
 *
 * Quien la registró (el dueño principal) busca a la otra persona por email o
 * DNI, confirma que es ella por el nombre parcial y le envía la solicitud: no
 * ve la mascota hasta que acepta. Cualquier dueño puede dejar de verla; el
 * único dueño no puede.
 *
 * Maneja su propio estado y habla directo con el controller para no sumar más
 * variables a la pantalla principal.
 */
@Composable
fun CompartirMascotaScreen(
    controller: MascotasCompartidasController,
    pet: PetResponse,
    miIdUsuario: Int?,
    onBack: () -> Unit,
    /** El backend respondió 401: hay que volver al login. */
    onSesionExpirada: () -> Unit,
    /** Se quitó o se fue un dueño: la lista de mascotas puede haber cambiado. */
    onCambio: () -> Unit,
    /** El usuario dejó de ver la mascota: ya no hay perfil al que volver. */
    onSalio: () -> Unit
) {
    val scope = rememberCoroutineScope()

    var duenios by remember { mutableStateOf<List<DuenoMascotaResponse>>(emptyList()) }
    var enviadas by remember { mutableStateOf<List<SolicitudCompartirResponse>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var loadError by remember { mutableStateOf<String?>(null) }

    var dato by remember { mutableStateOf("") }
    var isBuscando by remember { mutableStateOf(false) }
    var encontrado by remember { mutableStateOf<UsuarioEncontradoResponse?>(null) }
    var isEnviando by remember { mutableStateOf(false) }
    var accionError by remember { mutableStateOf<String?>(null) }
    var accionOk by remember { mutableStateOf<String?>(null) }

    var procesandoId by remember { mutableStateOf<Int?>(null) }
    var duenioAQuitar by remember { mutableStateOf<DuenoMascotaResponse?>(null) }
    var confirmaSalir by remember { mutableStateOf(false) }
    var isSaliendo by remember { mutableStateOf(false) }

    val soyPrincipal = duenios.any { it.idUsuario == miIdUsuario && it.esPrincipal }

    fun manejar(error: Throwable, fallback: String, destino: (String) -> Unit) {
        when (val resultado = errorDeCompartir(error, fallback)) {
            ErrorCompartir.SesionExpirada -> onSesionExpirada()
            is ErrorCompartir.Mensaje -> destino(resultado.texto)
        }
    }

    suspend fun cargar() {
        isLoading = true
        loadError = null
        try {
            duenios = controller.listarDuenios(pet.id)
            // Solo el principal puede tener solicitudes enviadas de esta mascota.
            val principal = duenios.any { it.idUsuario == miIdUsuario && it.esPrincipal }
            enviadas = if (principal) controller.listarEnviadas(pet.id) else emptyList()
        } catch (exception: Exception) {
            manejar(exception, "No se pudieron cargar los dueños") { loadError = it }
        } finally {
            isLoading = false
        }
    }

    LaunchedEffect(pet.id) { cargar() }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .systemBarsPadding()
            .padding(20.dp)
            .verticalScroll(rememberScrollState())
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) {
                Icon(
                    painter = painterResource(R.drawable.ic_arrow_back),
                    contentDescription = "Volver",
                    tint = PetCareTealDark
                )
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(text = "Compartir mascota", style = MaterialTheme.typography.headlineSmall)
                Text(
                    text = pet.nombre,
                    color = PetCareMuted,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }

        Spacer(modifier = Modifier.height(18.dp))

        when {
            isLoading -> Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 24.dp),
                horizontalArrangement = Arrangement.Center
            ) { CircularProgressIndicator() }

            loadError != null -> TarjetaError(
                mensaje = loadError.orEmpty(),
                onRetry = { scope.launch { cargar() } }
            )

            else -> {
                SeccionDuenios(
                    duenios = duenios,
                    miIdUsuario = miIdUsuario,
                    puedeQuitar = soyPrincipal,
                    onQuitar = { duenioAQuitar = it }
                )

                if (soyPrincipal) {
                    Spacer(modifier = Modifier.height(20.dp))

                    SeccionCompartir(
                        dato = dato,
                        onDatoChange = {
                            dato = it
                            encontrado = null
                            accionError = null
                            accionOk = null
                        },
                        isBuscando = isBuscando,
                        encontrado = encontrado,
                        isEnviando = isEnviando,
                        error = accionError,
                        ok = accionOk,
                        onDescartar = {
                            encontrado = null
                            dato = ""
                        },
                        onBuscar = {
                            isBuscando = true
                            accionError = null
                            accionOk = null
                            encontrado = null
                            scope.launch {
                                try {
                                    encontrado = controller.buscarUsuario(dato)
                                } catch (exception: Exception) {
                                    manejar(exception, "No se pudo buscar a la persona") {
                                        accionError = it
                                    }
                                } finally {
                                    isBuscando = false
                                }
                            }
                        },
                        onEnviar = { persona ->
                            isEnviando = true
                            accionError = null
                            scope.launch {
                                try {
                                    controller.solicitar(pet.id, persona.idUsuario)
                                    accionOk = "Le enviamos la solicitud a ${persona.nombreParcial}\n" +
                                        "Va a ver la mascota cuando la acepte."
                                    dato = ""
                                    encontrado = null
                                    enviadas = controller.listarEnviadas(pet.id)
                                } catch (exception: Exception) {
                                    manejar(exception, "No se pudo enviar la solicitud") {
                                        accionError = it
                                    }
                                } finally {
                                    isEnviando = false
                                }
                            }
                        }
                    )

                    if (enviadas.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(20.dp))
                        SeccionEnviadas(
                            enviadas = enviadas,
                            procesandoId = procesandoId,
                            onCancelar = { solicitud ->
                                procesandoId = solicitud.idSolicitud
                                accionError = null
                                accionOk = null
                                scope.launch {
                                    try {
                                        controller.cancelar(solicitud.idSolicitud)
                                        enviadas = enviadas.filter {
                                            it.idSolicitud != solicitud.idSolicitud
                                        }
                                    } catch (exception: Exception) {
                                        manejar(exception, "No se pudo cancelar la solicitud") {
                                            accionError = it
                                        }
                                        // Quizás ya la respondieron: se vuelve a leer.
                                        runCatching {
                                            enviadas = controller.listarEnviadas(pet.id)
                                        }
                                    } finally {
                                        procesandoId = null
                                    }
                                }
                            }
                        )
                    }
                } else {
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "Solo quien registró a ${pet.nombre} puede compartirla con otras personas.",
                        color = PetCareMuted,
                        style = MaterialTheme.typography.bodySmall
                    )
                }

                Spacer(modifier = Modifier.height(28.dp))

                if (duenios.size > 1) {
                    OutlinedButton(
                        elevation = elevacionBoton(),
                        colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(containerColor = androidx.compose.material3.MaterialTheme.colorScheme.surface),
                        onClick = { confirmaSalir = true },
                        enabled = !isSaliendo,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        shape = MaterialTheme.shapes.large,
                        border = BorderStroke(1.dp, PetCareError)
                    ) {
                        Text(text = "Dejar de ver a ${pet.nombre}", color = PetCareError)
                    }
                } else {
                    Text(
                        text = "Sos la única persona dueña de ${pet.nombre}, por eso no podés dejar de verla.",
                        color = PetCareMuted,
                        style = MaterialTheme.typography.bodySmall
                    )
                }

                if (accionError != null && encontrado == null && !soyPrincipal) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = accionError.orEmpty(),
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }
        }
    }

    duenioAQuitar?.let { duenio ->
        AlertDialog(
            onDismissRequest = { duenioAQuitar = null },
            title = { Text("Dejar de compartir") },
            text = {
                Text(
                    "${duenio.nombre} va a dejar de ver a ${pet.nombre}. " +
                        "Podés volver a compartirla cuando quieras."
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    duenioAQuitar = null
                    scope.launch {
                        accionError = null
                        accionOk = null
                        try {
                            controller.quitarDuenio(pet.id, duenio.idUsuario)
                            onCambio()
                            cargar()
                        } catch (exception: Exception) {
                            manejar(exception, "No se pudo quitar a la persona") {
                                accionError = it
                            }
                        }
                    }
                }) { Text("Dejar de compartir", color = PetCareError) }
            },
            dismissButton = {
                TextButton(onClick = { duenioAQuitar = null }) { Text("Cancelar") }
            }
        )
    }

    if (confirmaSalir) {
        AlertDialog(
            onDismissRequest = { confirmaSalir = false },
            title = { Text("Dejar de ver a ${pet.nombre}") },
            text = {
                Text(
                    "Vas a dejar de ver esta mascota en tu cuenta. " +
                        "Para las demás personas sigue existiendo."
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    confirmaSalir = false
                    isSaliendo = true
                    scope.launch {
                        try {
                            controller.salir(pet.id)
                            onCambio()
                            onSalio()
                        } catch (exception: Exception) {
                            manejar(exception, "No se pudo dejar la mascota") {
                                accionError = it
                            }
                        } finally {
                            isSaliendo = false
                        }
                    }
                }) { Text("Dejar de verla", color = PetCareError) }
            },
            dismissButton = {
                TextButton(onClick = { confirmaSalir = false }) { Text("Cancelar") }
            }
        )
    }
}

@Composable
private fun SeccionDuenios(
    duenios: List<DuenoMascotaResponse>,
    miIdUsuario: Int?,
    puedeQuitar: Boolean,
    onQuitar: (DuenoMascotaResponse) -> Unit
) {
    Text(text = "Dueños", style = MaterialTheme.typography.titleMedium)
    Spacer(modifier = Modifier.height(8.dp))

    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = elevacionTarjeta(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, PetCareLine),
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
            duenios.forEach { duenio ->
                val esYo = duenio.idUsuario == miIdUsuario
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = if (esYo) "${duenio.nombre} (vos)" else duenio.nombre,
                            style = MaterialTheme.typography.bodyLarge
                        )
                    }
                    if (duenio.esPrincipal) {
                        Surface(color = PetCareTealSoft, shape = MaterialTheme.shapes.small) {
                            Text(
                                text = "Principal",
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                                color = PetCareTealDark,
                                style = MaterialTheme.typography.labelSmall
                            )
                        }
                    } else if (puedeQuitar) {
                        TextButton(onClick = { onQuitar(duenio) }) {
                            Text("Quitar", color = PetCareError)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SeccionCompartir(
    dato: String,
    onDatoChange: (String) -> Unit,
    isBuscando: Boolean,
    encontrado: UsuarioEncontradoResponse?,
    isEnviando: Boolean,
    error: String?,
    ok: String?,
    onBuscar: () -> Unit,
    onEnviar: (UsuarioEncontradoResponse) -> Unit,
    onDescartar: () -> Unit
) {
    Text(text = "Compartir con otra persona", style = MaterialTheme.typography.titleMedium)
    Text(
        text = "Buscala por email o DNI. Cuando acepte, va a ver y editar la misma mascota.",
        color = PetCareMuted,
        style = MaterialTheme.typography.bodySmall
    )
    Spacer(modifier = Modifier.height(10.dp))

    OutlinedTextField(
        value = dato,
        onValueChange = onDatoChange,
        modifier = Modifier.fillMaxWidth(),
        label = { Text("Email o DNI") },
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email)
    )

    Spacer(modifier = Modifier.height(10.dp))

    Button(
        elevation = elevacionBoton(),
        onClick = onBuscar,
        enabled = dato.isNotBlank() && !isBuscando,
        modifier = Modifier
            .fillMaxWidth()
            .height(52.dp),
        shape = MaterialTheme.shapes.large
    ) {
        if (isBuscando) {
            CircularProgressIndicator(
                modifier = Modifier.height(22.dp),
                color = MaterialTheme.colorScheme.onPrimary
            )
        } else {
            Text("Buscar")
        }
    }

    if (error != null) {
        Spacer(modifier = Modifier.height(10.dp))
        Text(
            text = error,
            color = MaterialTheme.colorScheme.error,
            style = MaterialTheme.typography.bodyMedium
        )
    }

    if (ok != null) {
        Spacer(modifier = Modifier.height(10.dp))
        Text(text = ok, color = PetCareTealDark, style = MaterialTheme.typography.bodyMedium)
    }

    if (encontrado != null) {
        Spacer(modifier = Modifier.height(16.dp))
        ConfirmarUsuarioCard(
            persona = encontrado,
            isEnviando = isEnviando,
            onEnviar = { onEnviar(encontrado) },
            onDescartar = onDescartar
        )
    }
}

/**
 * Confirma que la persona encontrada es la correcta antes de enviarle la
 * solicitud. Solo se muestra el nombre parcial: el email y el DNI no se
 * revelan a quien busca.
 */
@Composable
private fun ConfirmarUsuarioCard(
    persona: UsuarioEncontradoResponse,
    isEnviando: Boolean,
    onEnviar: () -> Unit,
    onDescartar: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = elevacionTarjeta(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, PetCareLine),
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Text(
                text = "CONFIRMAR USUARIO",
                color = PetCareTealDark,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp
            )

            Spacer(modifier = Modifier.height(14.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    modifier = Modifier.size(52.dp),
                    shape = CircleShape,
                    color = PetCareTealSoft
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            text = persona.nombreParcial.take(1).uppercase(),
                            color = PetCareTealDark,
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                Spacer(modifier = Modifier.width(14.dp))

                Column {
                    Text(
                        text = persona.nombreParcial,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = "Es esta persona?",
                        color = PetCareMuted,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Text(
                text = "Verificá que sea quien buscás.",
                color = PetCareMuted,
                style = MaterialTheme.typography.bodySmall
            )

            Spacer(modifier = Modifier.height(16.dp))

            Button(
                elevation = elevacionBoton(),
                onClick = onEnviar,
                enabled = !isEnviando,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = MaterialTheme.shapes.large
            ) {
                Text(if (isEnviando) "Enviando..." else "Sí, enviar solicitud")
            }

            TextButton(
                onClick = onDescartar,
                enabled = !isEnviando,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("No es esta persona", color = PetCareMuted)
            }
        }
    }
}

@Composable
private fun SeccionEnviadas(
    enviadas: List<SolicitudCompartirResponse>,
    procesandoId: Int?,
    onCancelar: (SolicitudCompartirResponse) -> Unit
) {
    Text(text = "Solicitudes pendientes", style = MaterialTheme.typography.titleMedium)
    Spacer(modifier = Modifier.height(8.dp))

    enviadas.forEach { solicitud ->
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 8.dp),
            elevation = elevacionTarjeta(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = BorderStroke(1.dp, PetCareLine),
            shape = MaterialTheme.shapes.extraLarge
        ) {
            Row(
                modifier = Modifier.padding(start = 16.dp, end = 8.dp, top = 8.dp, bottom = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(text = solicitud.nombreDestino, style = MaterialTheme.typography.bodyLarge)
                    Text(
                        text = "Esperando respuesta",
                        color = PetCareMuted,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
                TextButton(
                    onClick = { onCancelar(solicitud) },
                    enabled = procesandoId != solicitud.idSolicitud
                ) {
                    Text(
                        text = if (procesandoId == solicitud.idSolicitud) "Cancelando..." else "Cancelar",
                        color = PetCareError
                    )
                }
            }
        }
    }
}

@Composable
private fun TarjetaError(mensaje: String, onRetry: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = elevacionTarjeta(),
        colors = CardDefaults.cardColors(containerColor = PetCareSurfaceSoft),
        border = BorderStroke(1.dp, PetCareLine),
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(
                text = mensaje,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodyMedium
            )
            OutlinedButton(
                elevation = elevacionBoton(),
                colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(containerColor = androidx.compose.material3.MaterialTheme.colorScheme.surface),
                onClick = onRetry,
                modifier = Modifier.fillMaxWidth(),
                shape = MaterialTheme.shapes.large
            ) { Text("Reintentar") }
        }
    }
}
