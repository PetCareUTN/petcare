package com.petcare.app.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.petcare.app.R
import com.petcare.app.ui.theme.PetCareError
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.ui.theme.PetCareSurfaceSoft
import com.petcare.app.ui.theme.PetCareTeal
import com.petcare.app.ui.theme.PetCareTealDark
import com.petcare.app.ui.theme.PetCareTealSoft

/*
 * Piezas comunes de los formularios (nueva mascota, publicar en adopción,
 * publicar un servicio...). Están acá para que todos se vean y se comporten
 * igual: mismo encabezado, mismas secciones, mismos campos y la acción
 * principal siempre abajo, a la vista.
 */

/** Encabezado con flecha para volver, título y una línea de contexto. */
@Composable
fun EncabezadoFormulario(
    titulo: String,
    subtitulo: String?,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(start = 8.dp, end = 20.dp, top = 8.dp, bottom = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconButton(onClick = onBack, enabled = enabled) {
            Icon(
                painter = painterResource(R.drawable.ic_arrow_back),
                contentDescription = "Volver",
                tint = PetCareTealDark
            )
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = titulo,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold
            )
            if (subtitulo != null) {
                Text(
                    text = subtitulo,
                    color = PetCareMuted,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }
    }
}

/** Grupo de campos relacionados, con su título, dentro de una tarjeta. */
@Composable
fun SeccionFormulario(
    titulo: String,
    modifier: Modifier = Modifier,
    iconRes: Int? = null,
    descripcion: String? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        elevation = elevacionTarjeta(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, PetCareLine),
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (iconRes != null) {
                    Surface(
                        modifier = Modifier.size(34.dp),
                        shape = CircleShape,
                        color = PetCareTealSoft
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                painter = painterResource(iconRes),
                                contentDescription = null,
                                tint = PetCareTealDark,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                }
                Column {
                    Text(
                        text = titulo,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    if (descripcion != null) {
                        Text(
                            text = descripcion,
                            color = PetCareMuted,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }
            }
            content()
        }
    }
}

/**
 * Campo que se ve como un campo de texto pero al tocarlo ejecuta [onClick]
 * (abrir un selector de fecha, hora, etc.).
 */
@Composable
fun CampoToque(
    label: String,
    valor: String,
    placeholder: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    isError: Boolean = false,
    supportingText: String? = null,
    iconRes: Int = R.drawable.ic_arrow_drop_down
) {
    Box(modifier = modifier) {
        OutlinedTextField(
            value = valor,
            onValueChange = {},
            readOnly = true,
            enabled = enabled,
            modifier = Modifier.fillMaxWidth(),
            label = { Text(label) },
            placeholder = { Text(placeholder) },
            isError = isError,
            supportingText = supportingText?.let { { Text(it) } },
            trailingIcon = {
                Icon(
                    painter = painterResource(iconRes),
                    contentDescription = null,
                    tint = PetCareMuted
                )
            },
            singleLine = true
        )
        // El campo de texto se come los toques: esta capa los recibe.
        if (enabled) {
            Box(
                modifier = Modifier
                    .matchParentSize()
                    .padding(bottom = if (supportingText != null) 20.dp else 0.dp)
                    .clickable(onClick = onClick)
            )
        }
    }
}

/** Lista desplegable de opciones de texto, con el mismo aspecto que un campo. */
@Composable
fun CampoSeleccion(
    label: String,
    valor: String,
    placeholder: String,
    opciones: List<String>,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
    etiqueta: (String) -> String = { it },
    enabled: Boolean = true,
    isError: Boolean = false,
    supportingText: String? = null
) {
    var expanded by remember { mutableStateOf(false) }

    Box(modifier = modifier) {
        CampoToque(
            label = label,
            valor = if (valor.isBlank()) "" else etiqueta(valor),
            placeholder = placeholder,
            onClick = { expanded = true },
            enabled = enabled,
            isError = isError,
            supportingText = supportingText
        )
        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
            modifier = Modifier.heightIn(max = 320.dp)
        ) {
            opciones.forEach { opcion ->
                DropdownMenuItem(
                    text = { Text(etiqueta(opcion)) },
                    onClick = {
                        onSelect(opcion)
                        expanded = false
                    }
                )
            }
        }
    }
}

/**
 * Elección única entre pocas opciones, como botones grandes en fila
 * (por ejemplo Macho/Hembra o el tamaño). Más rápido que un desplegable.
 */
@Composable
fun GrupoChips(
    opciones: List<Pair<String, String>>,
    seleccionado: String?,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    isError: Boolean = false
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        opciones.forEach { (valor, etiqueta) ->
            val activo = seleccionado == valor
            Surface(
                modifier = Modifier
                    .weight(1f)
                    .clickable(enabled = enabled) { onSelect(valor) },
                color = if (activo) PetCareTeal else MaterialTheme.colorScheme.surface,
                shape = MaterialTheme.shapes.large,
                shadowElevation = 2.dp,
                border = BorderStroke(
                    1.dp,
                    when {
                        activo -> PetCareTeal
                        isError -> PetCareError
                        else -> PetCareLine
                    }
                )
            ) {
                Text(
                    text = etiqueta,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 13.dp),
                    textAlign = TextAlign.Center,
                    color = if (activo) Color.White else PetCareTealDark,
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = if (activo) FontWeight.Bold else FontWeight.Medium,
                    maxLines = 1
                )
            }
        }
    }
}

/** Fila de sí/no con interruptor, para características de la mascota. */
@Composable
fun FilaInterruptor(
    titulo: String,
    checked: Boolean,
    onChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
    descripcion: String? = null,
    enabled: Boolean = true
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clickable(enabled = enabled) { onChange(!checked) }
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(text = titulo, style = MaterialTheme.typography.bodyLarge)
            if (descripcion != null) {
                Text(
                    text = descripcion,
                    color = PetCareMuted,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
        Switch(
            checked = checked,
            onCheckedChange = onChange,
            enabled = enabled,
            colors = SwitchDefaults.colors(
                checkedTrackColor = PetCareTeal,
                checkedThumbColor = Color.White
            )
        )
    }
}

/** Separador fino entre filas dentro de una sección. */
@Composable
fun SeparadorFila() {
    HorizontalDivider(color = PetCareLine)
}

/** Aviso de error (o info) con un ícono, para mostrar sobre la acción principal. */
@Composable
fun AvisoFormulario(
    texto: String,
    modifier: Modifier = Modifier,
    esError: Boolean = true
) {
    val color = if (esError) PetCareError else PetCareTealDark
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = if (esError) Color(0xFFFDECEA) else PetCareTealSoft,
        shape = MaterialTheme.shapes.large,
        border = BorderStroke(1.dp, color.copy(alpha = 0.25f))
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Icon(
                painter = painterResource(R.drawable.ic_info),
                contentDescription = null,
                tint = color,
                modifier = Modifier.size(20.dp)
            )
            Text(
                text = texto,
                color = color,
                style = MaterialTheme.typography.bodyMedium
            )
        }
    }
}

/**
 * Barra inferior con la acción principal del formulario. Queda siempre a la
 * vista: no hay que bajar hasta el final para guardar.
 */
@Composable
fun BarraAccionFormulario(
    texto: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    isLoading: Boolean = false,
    aviso: String? = null
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 8.dp
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            if (aviso != null) {
                AvisoFormulario(texto = aviso)
            }
            Button(
                elevation = elevacionBoton(),
                onClick = onClick,
                enabled = enabled && !isLoading,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(54.dp),
                shape = MaterialTheme.shapes.large
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(22.dp),
                        strokeWidth = 2.dp,
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Text(text = texto, style = MaterialTheme.typography.titleSmall)
                }
            }
        }
    }
}

/** Fila horizontal de etiquetas que se desplaza si no entran. */
@Composable
fun FilaEtiquetas(
    etiquetas: List<String>,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier.horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        etiquetas.forEach { texto ->
            Surface(color = PetCareSurfaceSoft, shape = CircleShape) {
                Text(
                    text = texto,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 5.dp),
                    style = MaterialTheme.typography.labelLarge,
                    maxLines = 1,
                    softWrap = false
                )
            }
        }
    }
}
