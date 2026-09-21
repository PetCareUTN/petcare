package com.petcare.app.features.perdidas.ui

import android.Manifest
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
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
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
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberMultiplePermissionsState
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.GoogleMap
import com.google.maps.android.compose.MapProperties
import com.google.maps.android.compose.MapUiSettings
import com.google.maps.android.compose.Marker
import com.google.maps.android.compose.rememberCameraPositionState
import com.google.maps.android.compose.rememberUpdatedMarkerState
import com.petcare.app.R
import com.petcare.app.features.mapa.ui.obtenerUltimaUbicacion
import com.petcare.app.ui.theme.PetCareError
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.ui.theme.PetCareTealDark
import com.petcare.app.ui.theme.PetCareTealSoft
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone

// Córdoba, Argentina: mismo centro por defecto que el mapa de prestadores,
// para cuando el usuario no da permiso de ubicación.
private val CENTRO_POR_DEFECTO = LatLng(-31.4201, -64.1888)

private const val MAX_DESCRIPCION = 1000
private const val MAX_CONTACTO = 150

/**
 * Formulario para reportar una mascota como perdida (US-36). La última
 * ubicación conocida arranca en el GPS del celular y el dueño la corrige
 * tocando el mapa: la mascota casi nunca se pierde justo donde está el
 * teléfono al momento de hacer el reporte.
 */
@OptIn(ExperimentalPermissionsApi::class, ExperimentalMaterial3Api::class)
@Composable
fun ReportarMascotaPerdidaScreen(
    petName: String,
    isSaving: Boolean,
    errorMessage: String?,
    contactoInicial: String,
    // null mientras se está cargando el tag de la mascota (US-32).
    tieneTagBle: Boolean?,
    onBack: () -> Unit,
    onReportar: (
        fechaPerdida: String,
        latitud: Double,
        longitud: Double,
        descripcion: String?,
        contacto: String?
    ) -> Unit
) {
    val context = LocalContext.current

    val locationPermissions = rememberMultiplePermissionsState(
        listOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
    )
    val hasLocationPermission = locationPermissions.permissions.any { it.status.isGranted }

    var descripcion by rememberSaveable { mutableStateOf("") }
    var contacto by rememberSaveable { mutableStateOf(contactoInicial) }
    // Por defecto "recién": el caso más común es que el dueño reporte apenas
    // se da cuenta de que la mascota no está.
    var fechaPerdidaMillis by rememberSaveable { mutableStateOf(System.currentTimeMillis()) }
    // Dónde quedó el pin. Mientras el dueño no lo mueva arrancamos desde el
    // GPS; una vez que tocó el mapa, su elección manda.
    var ubicacion by remember { mutableStateOf(CENTRO_POR_DEFECTO) }
    var ubicacionElegida by rememberSaveable { mutableStateOf(false) }

    val markerState = rememberUpdatedMarkerState(position = ubicacion)
    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(CENTRO_POR_DEFECTO, 11f)
    }

    // El perfil del dueño puede llegar después de abrir la pantalla, así que
    // el teléfono se prellena cuando aparece, sin pisar lo que ya haya escrito.
    LaunchedEffect(contactoInicial) {
        if (contacto.isBlank()) contacto = contactoInicial
    }

    LaunchedEffect(hasLocationPermission) {
        if (hasLocationPermission && !ubicacionElegida) {
            obtenerUltimaUbicacion(context)?.let { actual ->
                ubicacion = actual
                cameraPositionState.position = CameraPosition.fromLatLngZoom(actual, 15f)
            }
        }
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
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onBack) {
                Icon(
                    painter = painterResource(R.drawable.ic_arrow_back),
                    contentDescription = "Volver",
                    tint = PetCareTealDark
                )
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Reportar como perdida",
                    style = MaterialTheme.typography.headlineSmall
                )
                Text(
                    text = petName,
                    color = PetCareMuted,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }

        Spacer(modifier = Modifier.height(18.dp))

        when (tieneTagBle) {
            true -> {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = PetCareTealSoft,
                    shape = MaterialTheme.shapes.large
                ) {
                    Text(
                        text = "Al reportarla, la red colaborativa empieza a avisarte si " +
                            "alguien la detecta cerca.",
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                        color = PetCareTealDark,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
                Spacer(modifier = Modifier.height(18.dp))
            }
            // Sin tag se puede reportar igual, pero sin red colaborativa: las
            // detecciones llegan por tagId y no habría con qué asociarlas.
            false -> {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = MaterialTheme.colorScheme.surface,
                    shape = MaterialTheme.shapes.large,
                    border = BorderStroke(1.dp, PetCareError)
                ) {
                    Text(
                        text = "$petName no tiene un tag vinculado. Podés reportarla " +
                            "igual, pero la red colaborativa no va a poder detectarla.",
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                        color = PetCareError,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
                Spacer(modifier = Modifier.height(18.dp))
            }
            // Todavía no sabemos si tiene tag: mejor no afirmar nada.
            null -> Unit
        }

        Text(
            text = "Cuándo la viste por última vez",
            style = MaterialTheme.typography.titleMedium
        )

        Spacer(modifier = Modifier.height(10.dp))

        FechaHoraPerdidaField(
            fechaPerdidaMillis = fechaPerdidaMillis,
            enabled = !isSaving,
            onCambio = { fechaPerdidaMillis = it }
        )

        Spacer(modifier = Modifier.height(18.dp))

        Text(
            text = "Dónde la viste por última vez",
            style = MaterialTheme.typography.titleMedium
        )

        Spacer(modifier = Modifier.height(6.dp))

        Text(
            text = "Tocá el mapa para mover el pin al lugar exacto",
            color = PetCareMuted,
            style = MaterialTheme.typography.bodySmall
        )

        Spacer(modifier = Modifier.height(10.dp))

        if (!hasLocationPermission) {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = PetCareTealSoft,
                shape = MaterialTheme.shapes.large
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "Activá tu ubicación para empezar desde donde estás",
                        color = PetCareTealDark,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.weight(1f)
                    )
                    TextButton(
                        onClick = { locationPermissions.launchMultiplePermissionRequest() }
                    ) {
                        Text("Activar")
                    }
                }
            }
            Spacer(modifier = Modifier.height(10.dp))
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(260.dp)
        ) {
            GoogleMap(
                modifier = Modifier.fillMaxSize(),
                cameraPositionState = cameraPositionState,
                properties = MapProperties(isMyLocationEnabled = hasLocationPermission),
                uiSettings = MapUiSettings(
                    myLocationButtonEnabled = hasLocationPermission,
                    zoomControlsEnabled = true
                ),
                onMapClick = { posicion ->
                    ubicacion = posicion
                    ubicacionElegida = true
                }
            ) {
                Marker(
                    state = markerState,
                    title = petName,
                    snippet = "Última ubicación conocida"
                )
            }
        }

        Spacer(modifier = Modifier.height(18.dp))

        OutlinedTextField(
            value = descripcion,
            onValueChange = {
                if (it.length <= MAX_DESCRIPCION) descripcion = it
            },
            label = { Text("Descripción") },
            placeholder = { Text("Collar rojo, es asustadiza, se escapó por el portón") },
            enabled = !isSaving,
            minLines = 3,
            modifier = Modifier.fillMaxWidth(),
            shape = MaterialTheme.shapes.large,
            keyboardOptions = KeyboardOptions(
                capitalization = KeyboardCapitalization.Sentences
            )
        )

        Spacer(modifier = Modifier.height(14.dp))

        OutlinedTextField(
            value = contacto,
            onValueChange = {
                if (it.length <= MAX_CONTACTO) contacto = it
            },
            label = { Text("Contacto") },
            placeholder = { Text("Teléfono o forma de contacto") },
            supportingText = { Text("Se lo mostramos a quien la encuentre") },
            enabled = !isSaving,
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            shape = MaterialTheme.shapes.large
        )

        if (errorMessage != null) {
            Spacer(modifier = Modifier.height(12.dp))
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface
                ),
                border = BorderStroke(1.dp, PetCareLine),
                shape = MaterialTheme.shapes.extraLarge
            ) {
                Text(
                    text = errorMessage,
                    modifier = Modifier.padding(16.dp),
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }

        Spacer(modifier = Modifier.height(18.dp))

        Button(
            onClick = {
                val posicion = ubicacion
                onReportar(
                    fechaPerdidaMillis.toIsoUtc(),
                    posicion.latitude,
                    posicion.longitude,
                    descripcion.trim().ifBlank { null },
                    contacto.trim().ifBlank { null }
                )
            },
            enabled = !isSaving,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            shape = MaterialTheme.shapes.large,
            colors = ButtonDefaults.buttonColors(containerColor = PetCareError)
        ) {
            if (isSaving) {
                CircularProgressIndicator(
                    modifier = Modifier.height(22.dp),
                    color = MaterialTheme.colorScheme.onPrimary
                )
            } else {
                Text("Reportar como perdida")
            }
        }

        Spacer(modifier = Modifier.height(24.dp))
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FechaHoraPerdidaField(
    fechaPerdidaMillis: Long,
    enabled: Boolean,
    onCambio: (Long) -> Unit
) {
    var showDatePicker by remember { mutableStateOf(false) }
    var showTimePicker by remember { mutableStateOf(false) }

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        OutlinedButton(
            onClick = { showDatePicker = true },
            enabled = enabled,
            modifier = Modifier.weight(1f),
            shape = MaterialTheme.shapes.large,
            border = BorderStroke(1.dp, PetCareLine)
        ) {
            Text(
                text = fechaPerdidaMillis.formatear("dd/MM/yyyy"),
                color = MaterialTheme.colorScheme.onSurface
            )
        }
        OutlinedButton(
            onClick = { showTimePicker = true },
            enabled = enabled,
            modifier = Modifier.weight(1f),
            shape = MaterialTheme.shapes.large,
            border = BorderStroke(1.dp, PetCareLine)
        ) {
            Text(
                text = fechaPerdidaMillis.formatear("HH:mm"),
                color = MaterialTheme.colorScheme.onSurface
            )
        }
    }

    if (showDatePicker) {
        val datePickerState = rememberDatePickerState(
            initialSelectedDateMillis = fechaPerdidaMillis
        )
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = {
                TextButton(
                    onClick = {
                        datePickerState.selectedDateMillis?.let { seleccionada ->
                            onCambio(fechaPerdidaMillis.conFechaDe(seleccionada))
                        }
                        showDatePicker = false
                    }
                ) {
                    Text("Aceptar")
                }
            },
            dismissButton = {
                TextButton(onClick = { showDatePicker = false }) {
                    Text("Cancelar")
                }
            }
        ) {
            DatePicker(state = datePickerState)
        }
    }

    if (showTimePicker) {
        val calendario = Calendar.getInstance().apply { timeInMillis = fechaPerdidaMillis }
        val timePickerState = rememberTimePickerState(
            initialHour = calendario.get(Calendar.HOUR_OF_DAY),
            initialMinute = calendario.get(Calendar.MINUTE),
            is24Hour = true
        )
        DatePickerDialog(
            onDismissRequest = { showTimePicker = false },
            confirmButton = {
                TextButton(
                    onClick = {
                        onCambio(
                            fechaPerdidaMillis.conHora(
                                timePickerState.hour,
                                timePickerState.minute
                            )
                        )
                        showTimePicker = false
                    }
                ) {
                    Text("Aceptar")
                }
            },
            dismissButton = {
                TextButton(onClick = { showTimePicker = false }) {
                    Text("Cancelar")
                }
            }
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                contentAlignment = Alignment.Center
            ) {
                TimePicker(state = timePickerState)
            }
        }
    }
}

private fun Long.formatear(patron: String): String =
    SimpleDateFormat(patron, Locale.getDefault()).format(Date(this))

/**
 * El DatePicker devuelve el día elegido a medianoche UTC, así que se toma solo
 * la parte de fecha y se conserva la hora que ya tenía el reporte.
 */
private fun Long.conFechaDe(fechaMillis: Long): Long {
    val elegida = Calendar.getInstance(TimeZone.getTimeZone("UTC")).apply {
        timeInMillis = fechaMillis
    }
    return Calendar.getInstance().apply {
        timeInMillis = this@conFechaDe
        set(Calendar.YEAR, elegida.get(Calendar.YEAR))
        set(Calendar.MONTH, elegida.get(Calendar.MONTH))
        set(Calendar.DAY_OF_MONTH, elegida.get(Calendar.DAY_OF_MONTH))
    }.timeInMillis
}

private fun Long.conHora(hora: Int, minuto: Int): Long =
    Calendar.getInstance().apply {
        timeInMillis = this@conHora
        set(Calendar.HOUR_OF_DAY, hora)
        set(Calendar.MINUTE, minuto)
        set(Calendar.SECOND, 0)
        set(Calendar.MILLISECOND, 0)
    }.timeInMillis

private fun Long.toIsoUtc(): String =
    SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }.format(Date(this))
