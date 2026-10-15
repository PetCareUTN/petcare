package com.petcare.app.features.notificaciones.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.petcare.app.features.profile.domain.ProfileController
import kotlinx.coroutines.launch

/**
 * Toggle de los recordatorios de vacunacion (US-40).
 *
 * El estado vive en el backend y no en el telefono: el recordatorio lo manda una
 * tarea del servidor, asi que de nada serviria guardar la preferencia local.
 *
 * El switch se mueve apenas el usuario lo toca y se revierte si el guardado
 * falla, en vez de quedarse trabado esperando la respuesta.
 */
@Composable
fun RecordatoriosVacunasCard(profileController: ProfileController) {
    val scope = rememberCoroutineScope()

    var activos by remember { mutableStateOf<Boolean?>(null) }
    var guardando by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        runCatching { profileController.getMyProfile() }
            .onSuccess { activos = it.recordatoriosVacunas }
            .onFailure { error = "No se pudo leer tu configuracion." }
    }

    fun cambiar(nuevoValor: Boolean) {
        val anterior = activos
        activos = nuevoValor
        guardando = true
        error = null

        scope.launch {
            runCatching { profileController.setRecordatoriosVacunas(nuevoValor) }
                .onSuccess { activos = it.recordatoriosVacunas }
                .onFailure {
                    // Volver atras el switch: dejarlo en el valor nuevo haria
                    // creer que se guardo cuando en el servidor sigue igual.
                    activos = anterior
                    error = "No se pudo guardar el cambio."
                }
            guardando = false
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
                        text = "Recordatorios de vacunas",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = when (activos) {
                            true -> "Te avisamos antes de que venza una vacuna de tus mascotas."
                            false -> "No vas a recibir avisos de vacunas por vencer."
                            null -> "Cargando..."
                        },
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }

                if (activos == null || guardando) {
                    CircularProgressIndicator(modifier = Modifier.size(24.dp))
                } else {
                    Switch(
                        checked = activos == true,
                        onCheckedChange = { cambiar(it) }
                    )
                }
            }

            error?.let { mensaje ->
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(start = 20.dp, end = 20.dp, bottom = 20.dp)
                ) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = mensaje,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }
        }
    }
}
