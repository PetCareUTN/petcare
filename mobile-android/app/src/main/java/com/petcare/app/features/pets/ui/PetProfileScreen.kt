package com.petcare.app.features.pets.ui

import android.Manifest
import android.os.Build
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.material3.Surface
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
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
import com.petcare.app.ui.components.SeccionFormulario
import com.petcare.app.ui.components.SeparadorFila
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.R
import com.petcare.app.ui.theme.PetCareTeal
import com.petcare.app.ui.theme.PetCareTealDark
import com.petcare.app.ui.theme.PetCareTealSoft
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
    onVerTagBle: () -> Unit = {},
    // Dueños de la mascota y cómo compartirla con otra persona.
    onCompartir: () -> Unit = {},
    // Abre la edición de la mascota. Null si no se puede editar desde acá.
    onEdit: (() -> Unit)? = null
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.Top,
        horizontalAlignment = Alignment.Start
    ) {
        when {
            isLoading -> {
                // Mientras carga no hay mascota que mostrar: solo la flecha para salir.
                IconButton(onClick = onBack) {
                    Icon(
                        painter = painterResource(R.drawable.ic_arrow_back),
                        contentDescription = "Volver",
                        tint = PetCareTealDark
                    )
                }
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
                IconButton(onClick = onBack) {
                    Icon(
                        painter = painterResource(R.drawable.ic_arrow_back),
                        contentDescription = "Volver",
                        tint = PetCareTealDark
                    )
                }
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
                    onBack = onBack,
                    onEdit = onEdit,
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
                    onVerTagBle = onVerTagBle,
                    onCompartir = onCompartir
                )
            }
        }
    }
}

@Composable
private fun PetProfileContent(
    pet: PetResponse,
    onBack: () -> Unit,
    onEdit: (() -> Unit)?,
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
    onVerTagBle: () -> Unit,
    onCompartir: () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        HeroMascota(pet = pet, onBack = onBack, onEdit = onEdit)

        // Lo que se consulta más seguido, de un vistazo.
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            DatoRapido(
                etiqueta = "Sexo",
                valor = if (pet.sexo.equals("macho", ignoreCase = true)) "Macho" else "Hembra",
                modifier = Modifier.weight(1f)
            )
            DatoRapido(
                etiqueta = "Edad",
                valor = edadLegible(pet.birthDate) ?: "—",
                modifier = Modifier.weight(1f)
            )
            DatoRapido(
                etiqueta = "Peso",
                valor = pet.peso?.let { "${formatearPeso(it)} kg" } ?: "—",
                modifier = Modifier.weight(1f)
            )
        }

        if (reporteActivo != null) {
            ReportePerdidaBanner(
                reporte = reporteActivo,
                onVerUltimaUbicacion = onVerUltimaUbicacion,
                tieneTagBle = tagBle != null,
                // Si la carga del tag falló, no sabemos si tiene: igual que cargando.
                tagBleDesconocido = isLoadingTagBle || tagBleError != null,
                onVincularTag = onVerTagBle
            )
        }

        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Button(
                onClick = onViewHistoria,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = MaterialTheme.shapes.large
            ) {
                Text("Ver historia clinica")
            }

            Button(
                onClick = onCompartir,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = MaterialTheme.shapes.large
            ) {
                Text("Compartir mascota")
            }
        }

        SeccionFormulario(titulo = "Datos", iconRes = R.drawable.ic_paw) {
            FilaDato(label = "Especie", value = pet.especie)
            SeparadorFila()
            FilaDato(label = "Raza", value = pet.raza ?: "Sin especificar")
            SeparadorFila()
            FilaDato(
                label = "Fecha de nacimiento",
                value = pet.birthDate?.let { fechaLegible(it) } ?: "Sin especificar"
            )
            SeparadorFila()
            FilaDato(label = "Esterilizado/a", value = if (pet.esterilizado) "Sí" else "No")
        }

        SeccionFormulario(titulo = "Información médica", iconRes = R.drawable.ic_heart) {
            FilaDato(
                label = "Alergias",
                value = pet.alergias?.ifBlank { null } ?: "Sin alergias registradas"
            )
            SeparadorFila()
            FilaDato(
                label = "Observaciones",
                value = pet.observaciones?.ifBlank { null } ?: "Sin observaciones registradas"
            )
        }

        SeccionFormulario(
            titulo = "Tag de localización",
            iconRes = R.drawable.ic_location,
            descripcion = "Para encontrarla si se pierde."
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(onClick = onVerTagBle),
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (isLoadingTagBle) {
                    CircularProgressIndicator(modifier = Modifier.size(22.dp))
                    Spacer(modifier = Modifier.weight(1f))
                } else {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Estado",
                            color = PetCareMuted,
                            style = MaterialTheme.typography.labelMedium
                        )
                        Text(
                            text = tagBle?.let { "Vinculado (${it.tagId})" } ?: "Sin vincular",
                            style = MaterialTheme.typography.bodyLarge
                        )
                    }
                }
                Text(
                    text = if (tagBle != null) "Gestionar" else "Vincular",
                    color = PetCareTealDark,
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        if (tagBle != null) {
            MonitoreoSeparacionCard(tagId = tagBle.tagId, nombreMascota = pet.nombre)
        }

        if (reporteError != null) {
            Text(
                text = reporteError,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodyMedium
            )
        }

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

        Spacer(modifier = Modifier.height(12.dp))
    }
}

/**
 * Cabecera del perfil: la foto de la mascota ocupa el protagonismo, con el
 * nombre encima y los accesos para volver y editar.
 */
@Composable
private fun HeroMascota(
    pet: PetResponse,
    onBack: () -> Unit,
    onEdit: (() -> Unit)?
) {
    val fotoUrl = remember(pet.foto) { resolvePetPhotoUrl(pet.foto) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, PetCareLine),
        shape = RoundedCornerShape(28.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(280.dp)
        ) {
            if (fotoUrl != null) {
                AsyncImage(
                    model = fotoUrl,
                    contentDescription = pet.nombre,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
            } else {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.linearGradient(listOf(PetCareTealDark, PetCareTeal))
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = pet.nombre.firstOrNull()?.uppercase() ?: "",
                        color = Color.White.copy(alpha = 0.35f),
                        style = MaterialTheme.typography.displayLarge,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Box(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .height(150.dp)
                    .background(
                        Brush.verticalGradient(
                            listOf(Color.Transparent, Color.Black.copy(alpha = 0.65f))
                        )
                    )
            )

            BotonCircularHero(
                iconRes = R.drawable.ic_arrow_back,
                descripcion = "Volver",
                onClick = onBack,
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(12.dp)
            )
            if (onEdit != null) {
                BotonCircularHero(
                    iconRes = R.drawable.ic_edit,
                    descripcion = "Editar mascota",
                    onClick = onEdit,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(12.dp)
                )
            }

            Column(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(horizontal = 20.dp, vertical = 18.dp)
            ) {
                Text(
                    text = pet.nombre,
                    color = Color.White,
                    style = MaterialTheme.typography.headlineLarge,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1
                )
                Text(
                    text = listOfNotNull(pet.especie, pet.raza?.takeIf { it.isNotBlank() })
                        .joinToString(" · "),
                    color = Color.White.copy(alpha = 0.92f),
                    style = MaterialTheme.typography.bodyLarge
                )
            }
        }
    }
}

@Composable
private fun BotonCircularHero(
    iconRes: Int,
    descripcion: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .size(44.dp)
            .clickable(onClick = onClick),
        shape = CircleShape,
        color = Color.White.copy(alpha = 0.92f),
        shadowElevation = 2.dp
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(
                painter = painterResource(iconRes),
                contentDescription = descripcion,
                tint = PetCareTealDark,
                modifier = Modifier.size(22.dp)
            )
        }
    }
}

@Composable
private fun DatoRapido(etiqueta: String, valor: String, modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier,
        color = PetCareTealSoft,
        shape = MaterialTheme.shapes.large
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp, horizontal = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = valor,
                color = PetCareTealDark,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                maxLines = 1
            )
            Text(
                text = etiqueta,
                color = PetCareMuted,
                style = MaterialTheme.typography.labelMedium
            )
        }
    }
}

@Composable
private fun FilaDato(label: String, value: String) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(
            text = label,
            color = PetCareMuted,
            style = MaterialTheme.typography.labelMedium
        )
        Text(text = value, style = MaterialTheme.typography.bodyLarge)
    }
}

/** "2 años", "5 meses" o "Menos de 1 mes" a partir de la fecha de nacimiento ISO. */
private fun edadLegible(nacimiento: String?): String? {
    val fecha = nacimiento?.takeIf { it.isNotBlank() } ?: return null
    return runCatching {
        val parsed = SimpleDateFormat("yyyy-MM-dd", Locale.US).parse(fecha) ?: return null
        val nac = java.util.Calendar.getInstance().apply { time = parsed }
        val hoy = java.util.Calendar.getInstance()
        var meses = (hoy.get(java.util.Calendar.YEAR) - nac.get(java.util.Calendar.YEAR)) * 12 +
            (hoy.get(java.util.Calendar.MONTH) - nac.get(java.util.Calendar.MONTH))
        if (hoy.get(java.util.Calendar.DAY_OF_MONTH) < nac.get(java.util.Calendar.DAY_OF_MONTH)) meses--
        when {
            meses < 0 -> null
            meses < 1 -> "< 1 mes"
            meses < 12 -> if (meses == 1) "1 mes" else "$meses meses"
            else -> (meses / 12).let { if (it == 1) "1 año" else "$it años" }
        }
    }.getOrNull()
}

/** "2026-03-10" -> "10/03/2026" */
private fun fechaLegible(iso: String): String {
    val partes = iso.take(10).split("-")
    return if (partes.size == 3) "${partes[2]}/${partes[1]}/${partes[0]}" else iso
}

/** 28.0 -> "28", 12.5 -> "12,5" */
private fun formatearPeso(peso: Double): String =
    if (peso % 1.0 == 0.0) peso.toInt().toString() else peso.toString().replace('.', ',')

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
