package com.petcare.app.features.mapa.ui

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
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
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
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
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberMultiplePermissionsState
import com.google.android.gms.location.LocationServices
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.GoogleMap
import com.google.maps.android.compose.MapProperties
import com.google.maps.android.compose.MapUiSettings
import com.google.maps.android.compose.Marker
import com.google.maps.android.compose.MarkerState
import com.google.maps.android.compose.rememberCameraPositionState
import com.petcare.app.R
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.ui.theme.PetCareTealDark
import com.petcare.app.ui.theme.PetCareTealSoft
import kotlin.coroutines.resume
import kotlinx.coroutines.suspendCancellableCoroutine

/**
 * Pin a mostrar en el mapa. Se arma en la pantalla que llama a
 * [MapaPrestadoresScreen] a partir de un [com.petcare.app.features.servicios.data.remote.ServicioResponse]
 * o un [com.petcare.app.features.turnos.data.remote.VeterinariaResponse], filtrando
 * los que todavía no tienen latitud/longitud (no bloquea nada, solo no se
 * pueden ubicar en el mapa hasta que se geocodifique la dirección).
 */
data class PinUbicacion(
    val id: Int,
    val titulo: String,
    val subtitulo: String?,
    val latitud: Double,
    val longitud: Double
)

// Córdoba, Argentina como centro por defecto cuando no hay pines con ubicación
// ni permiso de geolocalización del usuario.
private val CENTRO_POR_DEFECTO = LatLng(-31.4201, -64.1888)

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun MapaPrestadoresScreen(
    titulo: String,
    subtitulo: String,
    pines: List<PinUbicacion>,
    onBack: () -> Unit,
    onSeleccionarPin: ((PinUbicacion) -> Unit)? = null
) {
    val context = LocalContext.current

    val locationPermissions = rememberMultiplePermissionsState(
        listOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
    )
    val hasLocationPermission = locationPermissions.permissions.any { it.status.isGranted }

    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(
            pines.firstOrNull()?.let { LatLng(it.latitud, it.longitud) } ?: CENTRO_POR_DEFECTO,
            if (pines.isEmpty()) 11f else 12f
        )
    }

    // Si el usuario da permiso, centramos el mapa en su ubicación actual
    // (tiene prioridad sobre los pines: el listado no viene ordenado por
    // cercanía, así que el primer pin no es necesariamente el más
    // relevante). Best-effort: si falla, se queda centrado en el primer pin
    // o en el centro por defecto.
    LaunchedEffect(hasLocationPermission) {
        if (hasLocationPermission) {
            obtenerUltimaUbicacion(context)?.let { ubicacion ->
                cameraPositionState.position = CameraPosition.fromLatLngZoom(ubicacion, 14f)
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .systemBarsPadding()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
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
                Text(text = titulo, style = MaterialTheme.typography.headlineSmall)
                Text(
                    text = subtitulo,
                    color = PetCareMuted,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }

        if (!hasLocationPermission) {
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp),
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
                        text = "Activá tu ubicación para verte en el mapa",
                        color = PetCareTealDark,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.weight(1f)
                    )
                    TextButton(onClick = { locationPermissions.launchMultiplePermissionRequest() }) {
                        Text("Activar")
                    }
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
        }

        if (onSeleccionarPin != null && pines.isNotEmpty()) {
            Text(
                text = "Tocá un pin y después el globo con el nombre para seleccionarlo",
                color = PetCareMuted,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.padding(horizontal = 20.dp)
            )
            Spacer(modifier = Modifier.height(8.dp))
        }

        Box(modifier = Modifier.fillMaxSize()) {
            GoogleMap(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(top = 12.dp),
                cameraPositionState = cameraPositionState,
                properties = MapProperties(isMyLocationEnabled = hasLocationPermission),
                uiSettings = MapUiSettings(
                    myLocationButtonEnabled = hasLocationPermission,
                    zoomControlsEnabled = true
                )
            ) {
                pines.forEach { pin ->
                    Marker(
                        state = MarkerState(position = LatLng(pin.latitud, pin.longitud)),
                        title = pin.titulo,
                        snippet = pin.subtitulo,
                        onInfoWindowClick = { onSeleccionarPin?.invoke(pin) }
                    )
                }
            }

            if (pines.isEmpty()) {
                Surface(
                    modifier = Modifier
                        .align(Alignment.TopCenter)
                        .padding(16.dp),
                    color = MaterialTheme.colorScheme.surface,
                    shape = MaterialTheme.shapes.large,
                    border = BorderStroke(1.dp, PetCareLine)
                ) {
                    Text(
                        text = "Todavía no hay prestadores con ubicación cargada en esta categoría",
                        modifier = Modifier.padding(12.dp),
                        color = PetCareMuted,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        }
    }
}

@SuppressLint("MissingPermission")
private suspend fun obtenerUltimaUbicacion(context: Context): LatLng? =
    suspendCancellableCoroutine { continuation ->
        val client = LocationServices.getFusedLocationProviderClient(context)
        runCatching {
            client.lastLocation
                .addOnSuccessListener { location ->
                    if (continuation.isActive) {
                        continuation.resume(location?.let { LatLng(it.latitude, it.longitude) })
                    }
                }
                .addOnFailureListener {
                    if (continuation.isActive) continuation.resume(null)
                }
        }.onFailure {
            if (continuation.isActive) continuation.resume(null)
        }
    }
