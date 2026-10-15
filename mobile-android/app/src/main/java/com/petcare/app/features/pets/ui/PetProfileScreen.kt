package com.petcare.app.features.pets.ui

import android.Manifest
import android.os.Build
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import com.petcare.app.features.ble.data.local.MonitoreoSeparacionPreferences
import com.petcare.app.features.ble.data.remote.TagBleResponse
import com.petcare.app.features.ble.domain.SensibilidadSeparacion
import com.petcare.app.features.ble.service.ServicioEscaneoBle
import com.petcare.app.features.perdidas.data.remote.ReportePerdidaResponse
import com.petcare.app.features.pets.data.remote.PetResponse
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState
import com.petcare.app.ui.theme.PetCareError
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.R
import com.petcare.app.ui.theme.PetCareTealDark
import java.text.SimpleDateFormat
import java.util.Locale

@Composable
fun PetProfileScreen(
    isLoading: Boolean,
    errorMessage: String?,
    pet: PetResponse?,
    onRetry: () -> Unit,
    onBack: () -> Unit,
    onViewHistoria: () -> Unit = {},
    // Reporte de mascota perdida abierto, si la mascota está reportada (US-36).
    reporteActivo: ReportePerdidaResponse? = null,
    isCerrandoReporte: Boolean = false,
    reporteError: String? = null,
    onReportarPerdida: () -> Unit = {},
    onMarcarEncontrada: () -> Unit = {},
    // Última ubicación conocida de la mascota perdida (US-37).
    onVerUltimaUbicacion: () -> Unit = {},
    // Tag BLE vinculado, si tiene (US-32).
    tagBle: TagBleResponse? = null,
    isLoadingTagBle: Boolean = false,
    tagBleError: String? = null,
    onVerTagBle: () -> Unit = {}
) {
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
            IconButton(onClick = onBack) {
                Icon(
                    painter = painterResource(R.drawable.ic_arrow_back),
                    contentDescription = "Volver",
                    tint = PetCareTealDark
                )
            }
            Text(
                text = "Perfil de la mascota",
                modifier = Modifier.weight(1f),
                style = MaterialTheme.typography.headlineSmall
            )
        }

        Spacer(modifier = Modifier.height(18.dp))

        when {
            isLoading -> {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    CircularProgressIndicator()
                }
            }

            errorMessage != null -> {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, PetCareLine),
                    shape = MaterialTheme.shapes.extraLarge
                ) {
                    Column(
                        modifier = Modifier.padding(18.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(
                            text = errorMessage,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodyMedium
                        )
                        OutlinedButton(
                            onClick = onRetry,
                            modifier = Modifier.fillMaxWidth(),
                            shape = MaterialTheme.shapes.large
                        ) {
                            Text("Reintentar")
                        }
                    }
                }
            }

            pet != null -> {
                PetProfileContent(
                    pet = pet,
                    onViewHistoria = onViewHistoria,
                    reporteActivo = reporteActivo,
                    isCerrandoReporte = isCerrandoReporte,
                    reporteError = reporteError,
                    onReportarPerdida = onReportarPerdida,
                    onMarcarEncontrada = onMarcarEncontrada,
                    onVerUltimaUbicacion = onVerUltimaUbicacion,
                    tagBle = tagBle,
                    isLoadingTagBle = isLoadingTagBle,
                    tagBleError = tagBleError,
                    onVerTagBle = onVerTagBle
                )
            }
        }
    }
}

@Composable
private fun PetProfileContent(
    pet: PetResponse,
    onViewHistoria: () -> Unit,
    reporteActivo: ReportePerdidaResponse?,
    isCerrandoReporte: Boolean,
    reporteError: String?,
    onReportarPerdida: () -> Unit,
    onMarcarEncontrada: () -> Unit,
    onVerUltimaUbicacion: () -> Unit,
    tagBle: TagBleResponse?,
    isLoadingTagBle: Boolean,
    tagBleError: String?,
    onVerTagBle: () -> Unit
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        PetAvatar(
            petName = pet.nombre,
            photoPath = pet.foto,
            modifier = Modifier.size(84.dp),
            textStyle = MaterialTheme.typography.headlineMedium
        )

        Spacer(modifier = Modifier.height(12.dp))

        Text(
            text = pet.nombre,
            style = MaterialTheme.typography.headlineMedium
        )
    }

    Spacer(modifier = Modifier.height(18.dp))

    if (reporteActivo != null) {
        ReportePerdidaBanner(
            reporte = reporteActivo,
            onVerUltimaUbicacion = onVerUltimaUbicacion,
            tieneTagBle = tagBle != null,
            // Si la carga del tag falló, no sabemos si tiene: igual que cargando.
            tagBleDesconocido = isLoadingTagBle || tagBleError != null,
            onVincularTag = onVerTagBle
        )
        Spacer(modifier = Modifier.height(18.dp))
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, PetCareLine),
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            DetailRow(label = "Especie", value = pet.especie)
            DetailRow(label = "Raza", value = pet.raza ?: "Sin especificar")
            DetailRow(
                label = "Sexo",
                value = if (pet.sexo.equals("macho", ignoreCase = true)) "Macho" else "Hembra"
            )
            DetailRow(
                label = "Fecha de nacimiento",
                value = pet.birthDate ?: "Sin especificar"
            )
            DetailRow(
                label = "Peso",
                value = pet.peso?.let { "$it kg" } ?: "Sin especificar"
            )
            DetailRow(
                label = "Esterilizado",
                value = if (pet.esterilizado) "Si" else "No"
            )
        }
    }

    Spacer(modifier = Modifier.height(18.dp))

    Text(
        text = "Informacion medica",
        style = MaterialTheme.typography.titleLarge
    )

    Spacer(modifier = Modifier.height(10.dp))

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, PetCareLine),
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            DetailRow(
                label = "Alergias",
                value = pet.alergias?.ifBlank { null } ?: "Sin alergias registradas"
            )
            DetailRow(
                label = "Observaciones",
                value = pet.observaciones?.ifBlank { null } ?: "Sin observaciones registradas"
            )
        }
    }

    Spacer(modifier = Modifier.height(18.dp))

    Text(
        text = "Tag BLE",
        style = MaterialTheme.typography.titleLarge
    )

    Spacer(modifier = Modifier.height(10.dp))

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onVerTagBle),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, PetCareLine),
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(18.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            if (isLoadingTagBle) {
                CircularProgressIndicator(modifier = Modifier.size(22.dp))
            } else {
                Column(modifier = Modifier.weight(1f)) {
                    DetailRow(
                        label = "Estado",
                        value = tagBle?.let { "Vinculado (${it.tagId})" } ?: "Sin vincular"
                    )
                }
            }
            Text(
                text = if (tagBle != null) "Gestionar" else "Vincular",
                color = PetCareTealDark,
                style = MaterialTheme.typography.labelLarge
            )
        }
    }

    if (tagBle != null) {
        Spacer(modifier = Modifier.height(10.dp))
        MonitoreoSeparacionCard(tagId = tagBle.tagId, nombreMascota = pet.nombre)
    }

    Spacer(modifier = Modifier.height(18.dp))

    Button(
        onClick = onViewHistoria,
        modifier = Modifier
            .fillMaxWidth()
            .height(52.dp),
        shape = MaterialTheme.shapes.large
    ) {
        Text("Ver historia clinica")
    }

    if (reporteError != null) {
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = reporteError,
            color = MaterialTheme.colorScheme.error,
            style = MaterialTheme.typography.bodyMedium
        )
    }

    Spacer(modifier = Modifier.height(12.dp))

    if (reporteActivo != null) {
        Button(
            onClick = onMarcarEncontrada,
            enabled = !isCerrandoReporte,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            shape = MaterialTheme.shapes.large
        ) {
            if (isCerrandoReporte) {
                CircularProgressIndicator(
                    modifier = Modifier.height(22.dp),
                    color = MaterialTheme.colorScheme.onPrimary
                )
            } else {
                Text("Marcar como encontrada")
            }
        }
    } else {
        OutlinedButton(
            onClick = onReportarPerdida,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            shape = MaterialTheme.shapes.large,
            border = BorderStroke(1.dp, PetCareError)
        ) {
            Text(text = "Reportar como perdida", color = PetCareError)
        }
    }

    Spacer(modifier = Modifier.height(24.dp))
}

/**
 * Estado "perdida" de la mascota: el reporte abierto y desde cuándo (US-36).
 *
 * Sin tag vinculado el reporte vale igual, pero la red colaborativa no puede
 * detectarla (las detecciones llegan por tagId), así que se lo decimos al dueño
 * en vez de prometerle avisos que nunca van a llegar.
 */
@Composable
private fun ReportePerdidaBanner(
    reporte: ReportePerdidaResponse,
    onVerUltimaUbicacion: () -> Unit,
    tieneTagBle: Boolean,
    tagBleDesconocido: Boolean,
    onVincularTag: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, PetCareError),
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = "Reportada como perdida",
                color = PetCareError,
                style = MaterialTheme.typography.titleMedium
            )
            Text(
                text = "Desde ${reporte.fechaPerdida.aFechaHoraLegible()}",
                color = PetCareMuted,
                style = MaterialTheme.typography.bodyMedium
            )
            reporte.descripcion?.ifBlank { null }?.let { descripcion ->
                Text(
                    text = descripcion,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
            reporte.contacto?.ifBlank { null }?.let { contacto ->
                Text(
                    text = "Contacto: $contacto",
                    color = PetCareMuted,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
            when {
                // Mientras no sabemos si tiene tag, no afirmamos nada.
                tagBleDesconocido -> Unit
                tieneTagBle -> Text(
                    text = "La red colaborativa te avisa si alguien la detecta cerca",
                    color = PetCareMuted,
                    style = MaterialTheme.typography.bodySmall
                )
                else -> {
                    Text(
                        text = "No tiene un tag vinculado, así que la red colaborativa " +
                            "no puede detectarla. Vinculá uno para que te avisen si " +
                            "alguien pasa cerca.",
                        color = PetCareError,
                        style = MaterialTheme.typography.bodySmall
                    )
                    TextButton(onClick = onVincularTag) {
                        Text("Vincular un tag", color = PetCareTealDark)
                    }
                }
            }
            // Sin tag no puede haber detecciones, así que el acceso a la última
            // ubicación se ofrece solo cuando puede traer algo (US-37).
            if (tieneTagBle || tagBleDesconocido) {
                TextButton(onClick = onVerUltimaUbicacion) {
                    Text("Ver ultima ubicacion", color = PetCareTealDark)
                }
            }
        }
    }
}

/** El backend manda la fecha en ISO-8601 UTC; se muestra en la zona del celular. */
private fun String.aFechaHoraLegible(): String =
    runCatching {
        val iso = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", Locale.US)
        SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault()).format(iso.parse(this)!!)
    }.getOrDefault(this)

/**
 * Monitoreo de separacion de esta mascota (US-34) y como avisa (US-35): sensibilidad
 * del umbral y silenciado de la alerta.
 *
 * Todo se guarda en [MonitoreoSeparacionPreferences] apenas se toca, y el service lo
 * lee en cada ciclo, asi que los cambios aplican sin reiniciar el escaneo y sobreviven
 * a cerrar la app.
 *
 * Todavia no tiene el flujo de permisos de Bluetooth y ubicacion guiado que si tiene
 * [com.petcare.app.features.ble.ui.ColaboracionBleCard]. Si pide el de notificaciones,
 * que es el unico sin el cual la alerta de US-35 no puede mostrarse.
 */
@OptIn(ExperimentalPermissionsApi::class)
@Composable
private fun MonitoreoSeparacionCard(tagId: String, nombreMascota: String) {
    val context = LocalContext.current
    val preferencias = remember { MonitoreoSeparacionPreferences(context) }
    var activo by remember(tagId) { mutableStateOf(preferencias.tagsMonitoreados().contains(tagId)) }
    var sensibilidad by remember(tagId) { mutableStateOf(preferencias.sensibilidad(tagId)) }
    var silenciada by remember(tagId) { mutableStateOf(preferencias.estaSilenciada(tagId)) }

    // La alerta sale del service, que no tiene de donde sacar el nombre: se lo deja
    // guardado cada vez que se abre el perfil, asi tambien toma los cambios de nombre.
    LaunchedEffect(tagId, nombreMascota) {
        preferencias.setNombreMascota(tagId, nombreMascota)
    }

    val permisoNotificaciones = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        rememberPermissionState(Manifest.permission.POST_NOTIFICATIONS)
    } else {
        null
    }
    val puedeNotificar = permisoNotificaciones?.status?.isGranted ?: true

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, PetCareLine),
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Column(modifier = Modifier.padding(18.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Avisarme si se aleja", style = MaterialTheme.typography.titleMedium)
                    Text(
                        "Te avisamos cuando su tag deja de detectarse cerca tuyo.",
                        style = MaterialTheme.typography.bodySmall,
                        color = PetCareMuted,
                    )
                }
                Switch(
                    checked = activo,
                    onCheckedChange = { encender ->
                        if (encender) {
                            preferencias.activarSeguimiento(tagId, nombreMascota)
                            ServicioEscaneoBle.iniciar(context)
                            if (!puedeNotificar) permisoNotificaciones?.launchPermissionRequest()
                        } else {
                            preferencias.desactivarSeguimiento(tagId)
                            ServicioEscaneoBle.detener(context)
                        }
                        activo = encender
                    }
                )
            }

            if (activo) {
                Spacer(modifier = Modifier.height(16.dp))
                Text("Sensibilidad", style = MaterialTheme.typography.labelLarge)
                Spacer(modifier = Modifier.height(6.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    SensibilidadSeparacion.entries.forEach { opcion ->
                        FilterChip(
                            selected = sensibilidad == opcion,
                            onClick = {
                                preferencias.setSensibilidad(tagId, opcion)
                                sensibilidad = opcion
                            },
                            label = { Text(opcion.etiqueta) }
                        )
                    }
                }
                Text(
                    sensibilidad.descripcion,
                    style = MaterialTheme.typography.bodySmall,
                    color = PetCareMuted,
                )

                Spacer(modifier = Modifier.height(16.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Silenciar alerta", style = MaterialTheme.typography.titleSmall)
                        Text(
                            "No suena en el celular, pero el aviso sigue quedando en la campanita.",
                            style = MaterialTheme.typography.bodySmall,
                            color = PetCareMuted,
                        )
                    }
                    Switch(
                        checked = silenciada,
                        onCheckedChange = { silenciar ->
                            preferencias.setSilenciada(tagId, silenciar)
                            silenciada = silenciar
                        }
                    )
                }

                if (!puedeNotificar && !silenciada) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        "Las notificaciones de PetCare están desactivadas, así que la alerta " +
                            "no se va a mostrar en el celular.",
                        style = MaterialTheme.typography.bodySmall,
                        color = PetCareError,
                    )
                    TextButton(onClick = { permisoNotificaciones?.launchPermissionRequest() }) {
                        Text("Permitir notificaciones", color = PetCareTealDark)
                    }
                }
            }
        }
    }
}

@Composable
private fun DetailRow(label: String, value: String) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(
            text = label,
            color = PetCareMuted,
            style = MaterialTheme.typography.labelLarge
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyLarge
        )
    }
}
