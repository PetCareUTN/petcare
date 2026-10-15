package com.petcare.app.features.ble.ui

import android.Manifest
import android.os.Build
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
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
import com.petcare.app.R
import com.petcare.app.features.ble.domain.EscaneoNoDisponibleException
import com.petcare.app.features.ble.domain.MotivoNoDisponible
import com.petcare.app.features.ble.domain.MotorEscaneoBle
import com.petcare.app.features.ble.domain.TagDetectado
import com.petcare.app.ui.theme.PetCareError
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.ui.theme.PetCareTealDark

/**
 * Vincular/desvincular el tag BLE de una mascota (US-32).
 *
 * El escaneo en sí reusa [MotorEscaneoBle] (compartido con US-30/31/34): esta
 * pantalla solo lo consume en primer plano, con ventanas más cortas que el
 * duty cycling pensado para segundo plano, para que la lista de tags cercanos
 * se sienta responsiva mientras el usuario mira la pantalla.
 */
@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun VincularTagScreen(
    petName: String,
    tagVinculado: TagBleUiState,
    isVinculando: Boolean,
    isDesvinculando: Boolean,
    errorMessage: String?,
    onBack: () -> Unit,
    onVincular: (tagId: String) -> Unit,
    onDesvincular: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .systemBarsPadding()
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
                text = "Tag BLE de $petName",
                modifier = Modifier.weight(1f),
                style = MaterialTheme.typography.headlineSmall
            )
        }

        Spacer(modifier = Modifier.height(18.dp))

        if (errorMessage != null) {
            Text(
                text = errorMessage,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodyMedium
            )
            Spacer(modifier = Modifier.height(12.dp))
        }

        when (tagVinculado) {
            is TagBleUiState.Cargando -> {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    CircularProgressIndicator()
                }
            }

            is TagBleUiState.Vinculado -> {
                TagVinculadoContent(
                    tagId = tagVinculado.tagId,
                    isDesvinculando = isDesvinculando,
                    onDesvincular = onDesvincular
                )
            }

            is TagBleUiState.SinVincular -> {
                BuscarTagContent(
                    isVinculando = isVinculando,
                    onVincular = onVincular
                )
            }
        }
    }
}

/** Estado del tag de la mascota, para no mezclar "cargando" con "sin tag". */
sealed interface TagBleUiState {
    data object Cargando : TagBleUiState
    data class Vinculado(val tagId: String) : TagBleUiState
    data object SinVincular : TagBleUiState
}

@Composable
private fun TagVinculadoContent(
    tagId: String,
    isDesvinculando: Boolean,
    onDesvincular: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, PetCareLine),
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(
                text = "Tag vinculado",
                color = PetCareMuted,
                style = MaterialTheme.typography.labelLarge
            )
            Text(text = tagId, style = MaterialTheme.typography.bodyLarge)
        }
    }

    Spacer(modifier = Modifier.height(18.dp))

    Button(
        onClick = onDesvincular,
        enabled = !isDesvinculando,
        modifier = Modifier.fillMaxWidth().height(52.dp),
        shape = MaterialTheme.shapes.large,
        colors = ButtonDefaults.buttonColors(containerColor = PetCareError)
    ) {
        if (isDesvinculando) {
            CircularProgressIndicator(
                modifier = Modifier.height(22.dp),
                color = MaterialTheme.colorScheme.onError
            )
        } else {
            Text("Desvincular tag")
        }
    }
}

@OptIn(ExperimentalPermissionsApi::class)
@Composable
private fun ColumnScope.BuscarTagContent(
    isVinculando: Boolean,
    onVincular: (tagId: String) -> Unit
) {
    val context = LocalContext.current
    val motor = remember { MotorEscaneoBle(context) }

    val permisos = rememberMultiplePermissionsState(
        buildList {
            add(Manifest.permission.ACCESS_FINE_LOCATION)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                add(Manifest.permission.BLUETOOTH_SCAN)
            }
        }
    )
    val tienePermisos = permisos.permissions.all { it.status.isGranted }

    val tagsDetectados = remember { mutableStateMapOf<String, TagDetectado>() }
    var motivoNoDisponible by remember { mutableStateOf<MotivoNoDisponible?>(null) }
    var tagSeleccionado by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(tienePermisos) {
        if (!tienePermisos) return@LaunchedEffect

        motivoNoDisponible = null
        tagsDetectados.clear()

        try {
            // Ventanas cortas y seguidas: el default de MotorEscaneoBle está
            // pensado para segundo plano (5 s cada 60 s), demasiado lento para
            // que esta pantalla se sienta viva con el usuario mirándola.
            motor.escanear(ventanaMillis = 5_000L, intervaloMillis = 10_000L)
                .collect { tag -> tagsDetectados[tag.tagId] = tag }
        } catch (excepcion: EscaneoNoDisponibleException) {
            motivoNoDisponible = excepcion.motivo
        }
    }

    when {
        !tienePermisos -> {
            PermisoBanner(onActivar = { permisos.launchMultiplePermissionRequest() })
        }

        motivoNoDisponible == MotivoNoDisponible.SIN_HARDWARE_BLE -> {
            MensajeEstado("Este equipo no tiene Bluetooth de baja energía (BLE).")
        }

        motivoNoDisponible == MotivoNoDisponible.BLUETOOTH_APAGADO -> {
            MensajeEstado("Activá el Bluetooth para buscar tags cercanos.")
        }

        motivoNoDisponible == MotivoNoDisponible.SIN_PERMISOS -> {
            PermisoBanner(onActivar = { permisos.launchMultiplePermissionRequest() })
        }

        tagsDetectados.isEmpty() -> {
            Column(
                modifier = Modifier.fillMaxWidth().padding(vertical = 24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                CircularProgressIndicator()
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = "Buscando tags PetCare cerca tuyo...",
                    color = PetCareMuted,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }

        else -> {
            Text(
                text = "Elegí el tag de la mascota",
                style = MaterialTheme.typography.titleMedium
            )
            Spacer(modifier = Modifier.height(10.dp))

            LazyColumn(
                modifier = Modifier.weight(1f, fill = false),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(
                    tagsDetectados.values.sortedByDescending { it.rssi },
                    key = { it.tagId }
                ) { tag ->
                    TagDetectadoRow(
                        tag = tag,
                        seleccionado = tag.tagId == tagSeleccionado,
                        onClick = { tagSeleccionado = tag.tagId }
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Button(
                onClick = { tagSeleccionado?.let(onVincular) },
                enabled = tagSeleccionado != null && !isVinculando,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = MaterialTheme.shapes.large
            ) {
                if (isVinculando) {
                    CircularProgressIndicator(
                        modifier = Modifier.height(22.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Text("Vincular este tag")
                }
            }
        }
    }
}

@Composable
private fun TagDetectadoRow(
    tag: TagDetectado,
    seleccionado: Boolean,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, if (seleccionado) PetCareTealDark else PetCareLine),
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            RadioButton(selected = seleccionado, onClick = onClick)
            Column(modifier = Modifier.weight(1f)) {
                Text(text = tag.tagId, style = MaterialTheme.typography.bodyLarge)
                Text(
                    text = "~${"%.0f".format(tag.distanciaAproximadaMetros)} m · ${tag.rssi} dBm",
                    color = PetCareMuted,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
    }
}

@Composable
private fun PermisoBanner(onActivar: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, PetCareLine),
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = "Necesitamos permiso de Bluetooth",
                style = MaterialTheme.typography.titleSmall
            )
            Text(
                text = "Para buscar el tag de tu mascota, la app necesita acceso a Bluetooth " +
                    "(y a la ubicación aproximada, que exige Android para poder escanear).",
                color = PetCareMuted,
                style = MaterialTheme.typography.bodyMedium
            )
            TextButton(onClick = onActivar) {
                Text("Activar")
            }
        }
    }
}

@Composable
private fun MensajeEstado(texto: String) {
    Text(
        text = texto,
        color = PetCareMuted,
        style = MaterialTheme.typography.bodyMedium,
        modifier = Modifier.padding(vertical = 24.dp)
    )
}
