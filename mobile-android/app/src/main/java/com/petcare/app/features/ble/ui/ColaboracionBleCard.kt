package com.petcare.app.features.ble.ui

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberMultiplePermissionsState
import com.google.accompanist.permissions.rememberPermissionState
import com.petcare.app.features.ble.data.local.ColaboracionPreferences
import com.petcare.app.features.ble.service.ServicioEscaneoBle

/**
 * Toggle de la colaboracion anonima con la busqueda de mascotas perdidas (US-30).
 *
 * Implementa el **flujo escalonado de permisos** que obliga Android, que no es un
 * dialogo sino dos pasos separados:
 *
 * 1. Permisos de primer plano: ubicacion precisa, mas `BLUETOOTH_SCAN` en API 31+ y
 *    `POST_NOTIFICATIONS` en API 33+ para la notificacion del foreground service.
 * 2. `ACCESS_BACKGROUND_LOCATION` aparte, con justificacion visible. En API 30+ ni
 *    siquiera aparece como dialogo: hay que mandar al usuario a Ajustes.
 *
 * Por eso el paso 2 se muestra como una explicacion con su propio boton, y no como un
 * permiso mas de la lista: pedirlos todos juntos hace que Android deniegue el de
 * background sin preguntar.
 *
 * Ver docs/spike-escaneo-ble-segundo-plano.md, punto 2.
 */
@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun ColaboracionBleCard() {
    val context = LocalContext.current
    val preferencias = remember { ColaboracionPreferences(context) }

    var activa by remember { mutableStateOf(preferencias.estaActiva()) }
    var mostrarPasoBackground by remember { mutableStateOf(false) }

    // El usuario toco el switch y todavia no terminamos de conseguir los permisos.
    // Sirve para retomar el flujo solo cuando vuelve de un dialogo o de Ajustes, en vez
    // de obligarlo a tocar el switch una vez por permiso.
    var intentandoActivar by remember { mutableStateOf(false) }

    val permisosDePrimerPlano = rememberMultiplePermissionsState(
        buildList {
            add(Manifest.permission.ACCESS_FINE_LOCATION)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                add(Manifest.permission.BLUETOOTH_SCAN)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                add(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    )

    // En API 24-28 no existe ACCESS_BACKGROUND_LOCATION: el permiso de ubicacion
    // alcanza para escanear tambien con la app cerrada, asi que el paso 2 no aplica.
    val requiereBackgroundAparte = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
    val permisoBackground = if (requiereBackgroundAparte) {
        rememberPermissionState(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
    } else {
        null
    }
    val tieneBackground = permisoBackground?.status?.isGranted ?: true

    fun activar() {
        preferencias.setActiva(true)
        activa = true
        mostrarPasoBackground = false
        intentandoActivar = false
        ServicioEscaneoBle.iniciar(context)
    }

    fun desactivar() {
        preferencias.setActiva(false)
        activa = false
        mostrarPasoBackground = false
        intentandoActivar = false
        ServicioEscaneoBle.detener(context)
    }

    fun intentarActivar() {
        intentandoActivar = true
        when {
            !permisosDePrimerPlano.allPermissionsGranted ->
                permisosDePrimerPlano.launchMultiplePermissionRequest()

            !tieneBackground -> mostrarPasoBackground = true

            else -> activar()
        }
    }

    // Retoma el flujo cuando cambia el estado de los permisos: al volver del dialogo
    // del paso 1 pasamos al paso 2, y al volver de Ajustes con el permiso concedido
    // arranca la colaboracion sin que el usuario tenga que tocar nada mas.
    LaunchedEffect(permisosDePrimerPlano.allPermissionsGranted, tieneBackground) {
        if (!intentandoActivar) return@LaunchedEffect

        when {
            !permisosDePrimerPlano.allPermissionsGranted -> Unit
            !tieneBackground -> mostrarPasoBackground = true
            else -> activar()
        }
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Column {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Colaborar con mascotas perdidas",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = if (activa) {
                            "Tu celular avisa cuando pasa cerca de una mascota perdida. " +
                                "No se registra ningún dato tuyo."
                        } else {
                            "Activalo para que tu celular ayude a encontrar mascotas " +
                                "perdidas cerca tuyo, de forma anónima."
                        },
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
                Switch(
                    checked = activa,
                    onCheckedChange = { quiereActivar ->
                        if (quiereActivar) intentarActivar() else desactivar()
                    }
                )
            }

            if (mostrarPasoBackground && !tieneBackground) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(start = 20.dp, end = 20.dp, bottom = 20.dp)
                ) {
                    Text(
                        text = "Falta un permiso más",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Para detectar mascotas perdidas con la app cerrada, Android " +
                            "pide que permitas el acceso a la ubicación \"todo el tiempo\". " +
                            "Solo se usa para ubicar de forma aproximada a la mascota, nunca a vos.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    TextButton(
                        onClick = {
                            // Desde API 30 el sistema ya no muestra diálogo para este
                            // permiso: lo deniega en el acto y hay que ir a Ajustes.
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                context.startActivity(
                                    Intent(
                                        Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                                        Uri.fromParts("package", context.packageName, null)
                                    )
                                )
                            } else {
                                permisoBackground?.launchPermissionRequest()
                            }
                        }
                    ) {
                        Text(
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                "Abrir Ajustes"
                            } else {
                                "Dar permiso"
                            }
                        )
                    }
                }
            }
        }
    }
}
