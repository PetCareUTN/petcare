package com.petcare.app.features.settings.ui

import com.petcare.app.ui.components.LocalEspacioBarraInferior
import com.petcare.app.ui.components.elevacionBoton
import com.petcare.app.ui.components.elevacionBotonContorno
import com.petcare.app.ui.components.elevacionTarjeta
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Slider
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberMultiplePermissionsState
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.Circle
import com.google.maps.android.compose.GoogleMap
import com.google.maps.android.compose.MapProperties
import com.google.maps.android.compose.MapUiSettings
import com.google.maps.android.compose.Marker
import com.google.maps.android.compose.rememberCameraPositionState
import com.google.maps.android.compose.rememberUpdatedMarkerState
import com.petcare.app.R
import com.petcare.app.features.mapa.ui.obtenerUltimaUbicacion
import com.petcare.app.features.profile.data.remote.ZonaCasaResponse
import com.petcare.app.features.profile.domain.ProfileController
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.ui.theme.PetCareTeal
import com.petcare.app.ui.theme.PetCareTealDark
import com.petcare.app.ui.theme.PetCareTealSoft
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

// Mismo centro por defecto que el resto de los mapas de la app.
private val CENTRO_POR_DEFECTO = LatLng(-31.4201, -64.1888)

// Mismos límites que valida el backend (GuardarZonaCasaDto). El mínimo cubre el
// redondeo de ~110 m que traen las detecciones.
private const val RADIO_MINIMO = 100
private const val RADIO_MAXIMO = 1000
private const val RADIO_POR_DEFECTO = 200
private const val PASO_RADIO = 50

/**
 * Zona de casa del dueño (P1-209): dónde vive y qué tan grande es "casa".
 *
 * Mientras la mascota se detecte dentro de este círculo no se guarda su
 * ubicación ni se avisa, y fuera de él llega el aviso preventivo (P1-210). Sin
 * zona no hay avisos preventivos: es la forma de activarlos.
 *
 * Igual que [com.petcare.app.features.notificaciones.ui.RecordatoriosVacunasCard],
 * carga y guarda por su cuenta contra el backend: la zona la usa el servidor al
 * recibir detecciones, así que no tiene sentido guardarla en el teléfono.
 */
@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun ZonaCasaScreen(
    profileController: ProfileController,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val locationPermissions = rememberMultiplePermissionsState(
        listOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
    )
    val hasLocationPermission = locationPermissions.permissions.any { it.status.isGranted }

    var zonaGuardada by remember { mutableStateOf<ZonaCasaResponse?>(null) }
    var cargaError by remember { mutableStateOf<String?>(null) }
    var guardando by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var mensaje by remember { mutableStateOf<String?>(null) }

    var centro by remember { mutableStateOf(CENTRO_POR_DEFECTO) }
    // Si el dueño ya tocó el mapa (o la zona venía guardada), el GPS no lo pisa.
    var centroElegido by remember { mutableStateOf(false) }
    var radioMetros by remember { mutableStateOf(RADIO_POR_DEFECTO) }

    val markerState = rememberUpdatedMarkerState(position = centro)
    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(CENTRO_POR_DEFECTO, 11f)
    }

    fun cargar() {
        cargaError = null
        scope.launch {
            runCatching { profileController.getZonaCasa() }
                .onSuccess { zona ->
                    zonaGuardada = zona
                    if (zona.configurada && zona.latitud != null && zona.longitud != null) {
                        val guardado = LatLng(zona.latitud, zona.longitud)
                        centro = guardado
                        centroElegido = true
                        radioMetros = zona.radioMetros ?: RADIO_POR_DEFECTO
                        cameraPositionState.position =
                            CameraPosition.fromLatLngZoom(guardado, 15f)
                    }
                }
                .onFailure { cargaError = "No se pudo leer tu zona de casa." }
        }
    }

    LaunchedEffect(Unit) { cargar() }

    LaunchedEffect(hasLocationPermission, zonaGuardada) {
        // Se espera a saber si ya había una zona: si la hay, manda la guardada.
        if (zonaGuardada == null || centroElegido || !hasLocationPermission) {
            return@LaunchedEffect
        }
        obtenerUltimaUbicacion(context)?.let { actual ->
            centro = actual
            cameraPositionState.position = CameraPosition.fromLatLngZoom(actual, 15f)
        }
    }

    fun guardar() {
        guardando = true
        error = null
        mensaje = null
        scope.launch {
            runCatching {
                profileController.guardarZonaCasa(centro.latitude, centro.longitude, radioMetros)
            }
                .onSuccess {
                    zonaGuardada = it
                    centroElegido = true
                    mensaje = "Listo. Te avisamos si detectan a tus mascotas fuera de esta zona."
                }
                .onFailure { error = "No se pudo guardar la zona de casa." }
            guardando = false
        }
    }

    fun quitar() {
        guardando = true
        error = null
        mensaje = null
        scope.launch {
            runCatching { profileController.quitarZonaCasa() }
                .onSuccess {
                    zonaGuardada = it
                    mensaje = "Quitaste tu zona de casa. Ya no vas a recibir avisos fuera de casa."
                }
                .onFailure { error = "No se pudo quitar la zona de casa." }
            guardando = false
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .systemBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(20.dp)
            .padding(bottom = LocalEspacioBarraInferior.current),
        verticalArrangement = Arrangement.Top
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
                    text = "Mi casa",
                    style = MaterialTheme.typography.headlineSmall
                )
                Text(
                    text = "Avisos si detectan a tu mascota lejos de casa",
                    color = PetCareMuted,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = PetCareTealSoft,
            shape = MaterialTheme.shapes.large
        ) {
            Text(
                text = "Si un celular de la red detecta a tu mascota fuera de este círculo, " +
                    "te avisamos aunque no la hayas reportado como perdida. Dentro del " +
                    "círculo no guardamos su ubicación.",
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                color = PetCareTealDark,
                style = MaterialTheme.typography.bodyMedium
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        when {
            cargaError != null -> {
                Text(
                    text = cargaError.orEmpty(),
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodyMedium
                )
                TextButton(onClick = { cargar() }) { Text("Reintentar") }
                return@Column
            }

            zonaGuardada == null -> {
                Box(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
                return@Column
            }
        }

        Text(
            text = "Tocá el mapa para marcar tu casa",
            color = PetCareMuted,
            style = MaterialTheme.typography.bodySmall
        )

        if (!hasLocationPermission && !centroElegido) {
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
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

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(300.dp)
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
                    centro = posicion
                    centroElegido = true
                }
            ) {
                Circle(
                    center = centro,
                    radius = radioMetros.toDouble(),
                    fillColor = PetCareTeal.copy(alpha = 0.15f),
                    strokeColor = PetCareTeal,
                    strokeWidth = 3f
                )
                Marker(state = markerState, title = "Mi casa")
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            elevation = elevacionTarjeta(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = BorderStroke(1.dp, PetCareLine),
            shape = MaterialTheme.shapes.extraLarge
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "Radio: $radioMetros m",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Slider(
                    value = radioMetros.toFloat(),
                    onValueChange = { valor ->
                        radioMetros = ((valor / PASO_RADIO).roundToInt() * PASO_RADIO)
                            .coerceIn(RADIO_MINIMO, RADIO_MAXIMO)
                    },
                    valueRange = RADIO_MINIMO.toFloat()..RADIO_MAXIMO.toFloat(),
                    steps = (RADIO_MAXIMO - RADIO_MINIMO) / PASO_RADIO - 1,
                    enabled = !guardando
                )
                Text(
                    text = "Que cubra tu casa y el patio, pero no la cuadra entera: " +
                        "si es muy grande, no te vamos a avisar cuando se aleje poco.",
                    color = PetCareMuted,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }

        mensaje?.let {
            Spacer(modifier = Modifier.height(12.dp))
            Text(text = it, color = PetCareTealDark, style = MaterialTheme.typography.bodyMedium)
        }
        error?.let {
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = it,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodyMedium
            )
        }

        Spacer(modifier = Modifier.height(18.dp))

        Button(
            elevation = elevacionBoton(),
            onClick = { guardar() },
            enabled = !guardando,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            shape = MaterialTheme.shapes.large
        ) {
            if (guardando) {
                CircularProgressIndicator(
                    modifier = Modifier.size(22.dp),
                    color = MaterialTheme.colorScheme.onPrimary
                )
            } else {
                Text("Guardar zona de casa")
            }
        }

        if (zonaGuardada?.configurada == true) {
            Spacer(modifier = Modifier.height(10.dp))
            OutlinedButton(
                elevation = elevacionBotonContorno(),
                colors = ButtonDefaults.outlinedButtonColors(
                    containerColor = MaterialTheme.colorScheme.surface
                ),
                onClick = { quitar() },
                enabled = !guardando,
                modifier = Modifier.fillMaxWidth(),
                shape = MaterialTheme.shapes.large
            ) {
                Text("Quitar zona de casa")
            }
        }
    }
}
