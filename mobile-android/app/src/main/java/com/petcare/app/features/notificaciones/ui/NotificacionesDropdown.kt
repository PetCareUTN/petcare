package com.petcare.app.features.notificaciones.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.petcare.app.features.notificaciones.data.remote.NotificacionResponse
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.ui.theme.PetCareTealDark
import com.petcare.app.ui.theme.PetCareTealSoft

/**
 * Panel de notificaciones que cuelga de la campana de la barra superior (US-22).
 * Se comporta como en cualquier app: se abre al tocar la campana y se cierra al
 * volver a tocarla o al tocar fuera.
 */
@Composable
fun NotificacionesDropdown(
    expanded: Boolean,
    isLoading: Boolean,
    errorMessage: String?,
    notificaciones: List<NotificacionResponse>,
    marcandoLeidaId: Int?,
    isMarcandoTodas: Boolean,
    onDismiss: () -> Unit,
    onRetry: () -> Unit,
    onMarcarLeida: (NotificacionResponse) -> Unit,
    onMarcarTodasLeidas: () -> Unit,
    /** Abre la última ubicación del reporte que indica la notificación (US-41). */
    onAbrirUltimaUbicacion: (Int) -> Unit = {},
    /** Abre el reporte de pérdida de la mascota que se alejó (US-34). */
    onReportarPerdida: (Int) -> Unit = {}
) {
    val noLeidas = notificaciones.count { !it.leida }

    DropdownMenu(
        expanded = expanded,
        onDismissRequest = onDismiss,
        modifier = Modifier
            .width(320.dp)
            .heightIn(max = 460.dp)
    ) {
        Text(
            text = "Notificaciones",
            modifier = Modifier.padding(start = 16.dp, top = 10.dp),
            style = MaterialTheme.typography.titleMedium
        )

        /*
         * En su propia fila y no al lado del título: así el texto entra en una
         * línea y el botón no queda pegado a la campana que abre el panel.
         */
        if (noLeidas > 0) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp),
                horizontalArrangement = Arrangement.End
            ) {
                TextButton(onClick = onMarcarTodasLeidas, enabled = !isMarcandoTodas) {
                    Text(
                        text = if (isMarcandoTodas) "Marcando..." else "Marcar todo como leído",
                        style = MaterialTheme.typography.labelMedium,
                        maxLines = 1
                    )
                }
            }
        } else {
            Spacer(modifier = Modifier.height(8.dp))
        }

        HorizontalDivider(color = PetCareLine)

        when {
            isLoading -> {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 24.dp),
                    horizontalArrangement = Arrangement.Center
                ) {
                    CircularProgressIndicator()
                }
            }

            errorMessage != null -> {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = errorMessage,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodyMedium
                    )
                    TextButton(onClick = onRetry) {
                        Text("Reintentar")
                    }
                }
            }

            notificaciones.isEmpty() -> {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = "No tenés notificaciones",
                        style = MaterialTheme.typography.titleSmall
                    )
                    Text(
                        text = "Cuando reserven o cancelen un turno te avisamos acá.",
                        color = PetCareMuted,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }

            else -> {
                notificaciones.forEachIndexed { indice, notificacion ->
                    NotificacionItem(
                        notificacion = notificacion,
                        isMarcando = marcandoLeidaId == notificacion.idNotificacion,
                        onMarcarLeida = { onMarcarLeida(notificacion) },
                        onAbrir = destinoDe(notificacion)?.let { idReporte ->
                            { onAbrirUltimaUbicacion(idReporte) }
                        } ?: mascotaAReportar(notificacion)?.let { idMascota ->
                            { onReportarPerdida(idMascota) }
                        }
                    )
                    if (indice < notificaciones.lastIndex) {
                        HorizontalDivider(color = PetCareLine)
                    }
                }
            }
        }
    }
}

@Composable
private fun NotificacionItem(
    notificacion: NotificacionResponse,
    isMarcando: Boolean,
    onMarcarLeida: () -> Unit,
    /** Null cuando la notificación no lleva a ninguna pantalla. */
    onAbrir: (() -> Unit)? = null
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .then(if (onAbrir != null) Modifier.clickable { onAbrir() } else Modifier)
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(color = PetCareTealSoft, shape = MaterialTheme.shapes.small) {
                Text(
                    text = tipoLabel(notificacion.tipo),
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                    color = PetCareTealDark,
                    style = MaterialTheme.typography.labelSmall
                )
            }
            Text(
                text = fechaLabel(notificacion.fechaEnvio),
                color = PetCareMuted,
                style = MaterialTheme.typography.labelSmall
            )
        }

        Text(
            text = notificacion.titulo,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = if (notificacion.leida) FontWeight.Normal else FontWeight.Bold
        )

        Text(
            text = notificacion.cuerpo,
            color = PetCareMuted,
            style = MaterialTheme.typography.bodySmall
        )

        if (onAbrir != null) {
            Text(
                // El destino depende del tipo: la deteccion lleva al mapa, y la
                // separacion a crear el reporte de perdida.
                text = if (notificacion.tipo == "mascota_separada") {
                    "Reportar como perdida"
                } else {
                    "Ver ultima ubicacion"
                },
                color = PetCareTealDark,
                style = MaterialTheme.typography.labelMedium
            )
        }

        if (!notificacion.leida) {
            TextButton(
                onClick = onMarcarLeida,
                enabled = !isMarcando,
                contentPadding = androidx.compose.foundation.layout.PaddingValues(0.dp)
            ) {
                Text(
                    text = if (isMarcando) "Marcando..." else "Marcar como leída",
                    style = MaterialTheme.typography.labelMedium
                )
            }
        }
    }
}

/**
 * Id del reporte al que lleva la notificación, o null si no lleva a ninguna
 * pantalla. Hoy solo las de detección navegan ahí (US-41).
 */
private fun destinoDe(notificacion: NotificacionResponse): Int? =
    notificacion.idReferencia?.takeIf { notificacion.tipo == "mascota_detectada" }

/**
 * Id de la mascota que hay que reportar como perdida, o null si la
 * notificación no es de separación (US-34).
 *
 * Va aparte de [destinoDe] porque el `idReferencia` significa otra cosa según
 * el tipo: en detección es un reporte que ya existe, y acá es la mascota sobre
 * la que el dueño todavía tiene que crear uno.
 */
private fun mascotaAReportar(notificacion: NotificacionResponse): Int? =
    notificacion.idReferencia?.takeIf { notificacion.tipo == "mascota_separada" }

internal fun tipoLabel(tipo: String): String = when (tipo) {
    "solicitud_recibida" -> "Solicitud"
    "aprobacion" -> "Aprobación"
    "rechazo" -> "Rechazo"
    "turno_confirmado" -> "Turno confirmado"
    "turno_cancelado" -> "Turno cancelado"
    "recordatorio_vacuna" -> "Vacunación"
    "mascota_detectada" -> "Mascota detectada"
    "mascota_separada" -> "Se alejó"
    else -> tipo
}

/** Pasa la fecha ISO que devuelve el backend a DD/MM/YYYY HH:MM. */
internal fun fechaLabel(fechaEnvio: String): String {
    val fechaHora = fechaEnvio.split("T")
    val fecha = fechaHora.getOrNull(0)?.split("-") ?: return fechaEnvio
    if (fecha.size != 3) return fechaEnvio
    val hora = fechaHora.getOrNull(1)?.take(5).orEmpty()
    return "${fecha[2]}/${fecha[1]}/${fecha[0]}${if (hora.isEmpty()) "" else " $hora"}"
}
