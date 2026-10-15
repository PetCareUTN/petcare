package com.petcare.app.features.perdidas.ui

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
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.Circle
import com.google.maps.android.compose.GoogleMap
import com.google.maps.android.compose.MapUiSettings
import com.google.maps.android.compose.Marker
import com.google.maps.android.compose.MarkerState
import com.google.maps.android.compose.rememberCameraPositionState
import com.petcare.app.R
import com.petcare.app.features.perdidas.data.remote.DeteccionResponse
import com.petcare.app.features.perdidas.data.remote.UltimaDeteccionResponse
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.ui.theme.PetCareTeal
import com.petcare.app.ui.theme.PetCareTealDark
import java.text.SimpleDateFormat
import java.util.Locale

/**
 * Última ubicación conocida de una mascota perdida (US-37).
 *
 * Muestra **un solo punto**, el más reciente, y no el recorrido completo: las
 * detecciones son avistajes sueltos de celulares que pasaron cerca, no un
 * rastreo continuo, y unirlas con una línea daría a entender un camino que
 * nadie observó.
 *
 * El círculo alrededor del pin es lo que evita dar una precisión falsa: el radio
 * lo calcula el backend sumando la precisión del GPS y el margen del redondeo de
 * coordenadas, así que la mascota estaba en algún lugar de ese círculo, no
 * exactamente en el centro.
 */
@Composable
fun UltimaUbicacionScreen(
    isLoading: Boolean,
    errorMessage: String?,
    ubicacion: UltimaDeteccionResponse?,
    onRetry: () -> Unit,
    onBack: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .systemBarsPadding()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 12.dp),
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
                    text = "Ultima ubicacion",
                    style = MaterialTheme.typography.headlineSmall
                )
                ubicacion?.nombreMascota?.let { nombre ->
                    Text(
                        text = "Donde detectaron a " + nombre + " por ultima vez",
                        color = PetCareMuted,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }
        }

        when {
            isLoading -> {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    CircularProgressIndicator()
                }
            }

            errorMessage != null -> {
                TarjetaError(detalle = errorMessage, onRetry = onRetry)
            }

            ubicacion?.ultimaDeteccion == null -> {
                EstadoSinDetecciones()
            }

            else -> {
                MapaDeteccion(deteccion = ubicacion.ultimaDeteccion)
            }
        }
    }
}

@Composable
private fun MapaDeteccion(deteccion: DeteccionResponse) {
    val punto = LatLng(deteccion.latitud, deteccion.longitud)
    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(
            punto,
            zoomParaRadio(deteccion.radioAproximadoMetros)
        )
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, PetCareLine),
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(
                text = "Detectada el " + deteccion.detectadoEn.aFechaHoraLegible(),
                style = MaterialTheme.typography.titleMedium
            )
            Text(
                text = "Ubicacion aproximada: estaba dentro de los " +
                    deteccion.radioAproximadoMetros + " m que marca el circulo.",
                color = PetCareMuted,
                style = MaterialTheme.typography.bodyMedium
            )
            Text(
                text = "La deteccion la hizo un celular que paso cerca, asi que la " +
                    "posicion es orientativa y no exacta.",
                color = PetCareMuted,
                style = MaterialTheme.typography.bodySmall
            )
        }
    }

    Spacer(modifier = Modifier.height(12.dp))

    Box(modifier = Modifier.fillMaxSize()) {
        GoogleMap(
            modifier = Modifier.fillMaxSize(),
            cameraPositionState = cameraPositionState,
            uiSettings = MapUiSettings(zoomControlsEnabled = true)
        ) {
            Circle(
                center = punto,
                radius = deteccion.radioAproximadoMetros.toDouble(),
                fillColor = PetCareTeal.copy(alpha = 0.15f),
                strokeColor = PetCareTeal,
                strokeWidth = 3f
            )
            Marker(
                state = MarkerState(position = punto),
                title = "Ultima deteccion",
                snippet = deteccion.detectadoEn.aFechaHoraLegible()
            )
        }
    }
}

/**
 * Reporte abierto que todavía nadie cruzó. Se explica por qué está vacío en vez
 * de mostrar un mapa en blanco, que haría pensar que la app falló.
 */
@Composable
private fun EstadoSinDetecciones() {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, PetCareLine),
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = "Todavia no hay detecciones",
                style = MaterialTheme.typography.titleMedium
            )
            Text(
                text = "Nadie de la red colaborativa paso cerca de su tag desde que la " +
                    "reportaste. Apenas alguien la detecte, la ubicacion aparece aca.",
                color = PetCareMuted,
                style = MaterialTheme.typography.bodyMedium
            )
        }
    }
}

@Composable
private fun TarjetaError(detalle: String, onRetry: () -> Unit) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp),
        color = MaterialTheme.colorScheme.surface,
        shape = MaterialTheme.shapes.extraLarge,
        border = BorderStroke(1.dp, PetCareLine)
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(
                text = "No se pudo cargar la ubicacion",
                style = MaterialTheme.typography.titleMedium
            )
            Text(
                text = detalle,
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

/**
 * Zoom que deja el círculo de incertidumbre entrando en pantalla: cuanto más
 * grande el radio, más lejos hay que pararse.
 */
private fun zoomParaRadio(radioMetros: Int): Float = when {
    radioMetros <= 150 -> 16f
    radioMetros <= 400 -> 15f
    radioMetros <= 1000 -> 14f
    else -> 13f
}

/** El backend manda la fecha en ISO-8601 UTC; se muestra en la zona del celular. */
private fun String.aFechaHoraLegible(): String =
    runCatching {
        val iso = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", Locale.US)
        SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault()).format(iso.parse(this)!!)
    }.getOrDefault(this)
