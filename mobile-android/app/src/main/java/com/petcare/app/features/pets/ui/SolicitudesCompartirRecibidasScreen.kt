package com.petcare.app.features.pets.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
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
import androidx.compose.ui.unit.dp
import com.petcare.app.R
import com.petcare.app.features.pets.data.remote.SolicitudCompartirResponse
import com.petcare.app.features.pets.domain.MascotasCompartidasController
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.ui.theme.PetCareSurfaceSoft
import com.petcare.app.ui.theme.PetCareTealDark
import kotlinx.coroutines.launch

/**
 * Las solicitudes que otras personas me hicieron para compartir una mascota.
 * Al aceptar, la mascota aparece en mi cuenta con todos sus datos.
 *
 * Maneja su propio estado, igual que [CompartirMascotaScreen].
 */
@Composable
fun SolicitudesCompartirRecibidasScreen(
    controller: MascotasCompartidasController,
    onBack: () -> Unit,
    /** El backend respondió 401: hay que volver al login. */
    onSesionExpirada: () -> Unit,
    /** Se aceptó una solicitud: la lista de mascotas cambió. */
    onAceptada: () -> Unit
) {
    val scope = rememberCoroutineScope()

    var solicitudes by remember { mutableStateOf<List<SolicitudCompartirResponse>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var procesandoId by remember { mutableStateOf<Int?>(null) }
    var mensaje by remember { mutableStateOf<String?>(null) }

    fun manejar(exception: Throwable, fallback: String) {
        when (val resultado = errorDeCompartir(exception, fallback)) {
            ErrorCompartir.SesionExpirada -> onSesionExpirada()
            is ErrorCompartir.Mensaje -> error = resultado.texto
        }
    }

    suspend fun cargar() {
        isLoading = true
        error = null
        try {
            solicitudes = controller.listarRecibidas()
        } catch (exception: Exception) {
            manejar(exception, "No se pudieron cargar las solicitudes")
        } finally {
            isLoading = false
        }
    }

    LaunchedEffect(Unit) { cargar() }

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
                Text(
                    text = "Mascotas compartidas",
                    style = MaterialTheme.typography.headlineSmall
                )
                Text(
                    text = "Solicitudes que te enviaron",
                    color = PetCareMuted,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }

        Spacer(modifier = Modifier.height(18.dp))

        if (mensaje != null) {
            Text(text = mensaje.orEmpty(), color = PetCareTealDark)
            Spacer(modifier = Modifier.height(10.dp))
        }

        if (error != null) {
            Text(
                text = error.orEmpty(),
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodyMedium
            )
            Spacer(modifier = Modifier.height(10.dp))
        }

        when {
            isLoading -> Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 24.dp),
                horizontalArrangement = Arrangement.Center
            ) { CircularProgressIndicator() }

            solicitudes.isEmpty() -> Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = PetCareSurfaceSoft),
                border = BorderStroke(1.dp, PetCareLine),
                shape = MaterialTheme.shapes.extraLarge
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "No tenés solicitudes pendientes",
                        style = MaterialTheme.typography.titleSmall
                    )
                    Text(
                        text = "Cuando alguien quiera compartir una mascota con vos te avisamos acá.",
                        color = PetCareMuted,
                        style = MaterialTheme.typography.bodySmall
                    )
                    OutlinedButton(
                        onClick = { scope.launch { cargar() } },
                        modifier = Modifier.fillMaxWidth(),
                        shape = MaterialTheme.shapes.large
                    ) { Text("Actualizar") }
                }
            }

            else -> solicitudes.forEach { solicitud ->
                val procesando = procesandoId == solicitud.idSolicitud
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 12.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surface
                    ),
                    border = BorderStroke(1.dp, PetCareLine),
                    shape = MaterialTheme.shapes.extraLarge
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            PetAvatar(
                                petName = solicitud.nombreMascota,
                                photoPath = solicitud.fotoMascota,
                                modifier = Modifier.size(48.dp),
                                textStyle = MaterialTheme.typography.titleMedium
                            )
                            Spacer(modifier = Modifier.padding(horizontal = 6.dp))
                            Column {
                                Text(
                                    text = solicitud.nombreMascota,
                                    style = MaterialTheme.typography.titleMedium
                                )
                                Text(
                                    text = solicitud.especieMascota,
                                    color = PetCareMuted,
                                    style = MaterialTheme.typography.bodySmall
                                )
                            }
                        }

                        Text(
                            text = "${solicitud.nombreOrigen} quiere compartir esta mascota con vos. " +
                                "Si aceptás, la vas a ver y editar en tu cuenta.",
                            style = MaterialTheme.typography.bodyMedium
                        )

                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(
                                onClick = {
                                    procesandoId = solicitud.idSolicitud
                                    error = null
                                    mensaje = null
                                    scope.launch {
                                        try {
                                            controller.aceptar(solicitud.idSolicitud)
                                            solicitudes = solicitudes.filter {
                                                it.idSolicitud != solicitud.idSolicitud
                                            }
                                            mensaje = "Ahora ves a ${solicitud.nombreMascota} en tus mascotas."
                                            onAceptada()
                                        } catch (exception: Exception) {
                                            manejar(exception, "No se pudo aceptar la solicitud")
                                            runCatching { solicitudes = controller.listarRecibidas() }
                                        } finally {
                                            procesandoId = null
                                        }
                                    }
                                },
                                enabled = !procesando,
                                modifier = Modifier.weight(1f),
                                shape = MaterialTheme.shapes.large
                            ) { Text(if (procesando) "..." else "Aceptar") }

                            OutlinedButton(
                                onClick = {
                                    procesandoId = solicitud.idSolicitud
                                    error = null
                                    mensaje = null
                                    scope.launch {
                                        try {
                                            controller.rechazar(solicitud.idSolicitud)
                                            solicitudes = solicitudes.filter {
                                                it.idSolicitud != solicitud.idSolicitud
                                            }
                                        } catch (exception: Exception) {
                                            manejar(exception, "No se pudo rechazar la solicitud")
                                            runCatching { solicitudes = controller.listarRecibidas() }
                                        } finally {
                                            procesandoId = null
                                        }
                                    }
                                },
                                enabled = !procesando,
                                modifier = Modifier.weight(1f),
                                shape = MaterialTheme.shapes.large
                            ) { Text("Rechazar") }
                        }
                    }
                }
            }
        }
    }
}
