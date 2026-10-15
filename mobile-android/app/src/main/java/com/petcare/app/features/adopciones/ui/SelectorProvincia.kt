package com.petcare.app.features.adopciones.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import com.petcare.app.R
import com.petcare.app.features.adopciones.domain.PROVINCIAS_ARGENTINA
import com.petcare.app.features.adopciones.domain.TODAS_LAS_PROVINCIAS

/**
 * Desplegable de provincias argentinas.
 *
 * Lo comparten la publicación (donde la provincia es obligatoria) y los
 * filtros (donde se puede no elegir ninguna). La diferencia está en
 * `incluirOpcionTodas`: con ella aparece arriba "Todas las provincias", que
 * devuelve null.
 *
 * Son 24 opciones, demasiadas para la fila de chips que usan los otros
 * filtros, de ahí el desplegable. Sigue el mismo patrón que el selector de
 * código de país del perfil: campo de solo lectura que abre el menú al tocarlo.
 */
@Composable
fun SelectorProvincia(
    provincia: String?,
    textoSinSeleccion: String,
    modifier: Modifier = Modifier,
    label: String = "Provincia",
    incluirOpcionTodas: Boolean = false,
    error: String? = null,
    enabled: Boolean = true,
    onProvinciaElegida: (String?) -> Unit
) {
    var menuAbierto by remember { mutableStateOf(false) }

    Box(modifier = modifier) {
        OutlinedTextField(
            value = provincia ?: textoSinSeleccion,
            onValueChange = {},
            modifier = Modifier
                .fillMaxWidth()
                .clickable(enabled = enabled) { menuAbierto = true },
            label = { Text(label) },
            readOnly = true,
            // Deshabilitado para que el teclado no se abra al tocarlo: el
            // campo no se escribe, solo abre el menú. Los colores se pisan
            // abajo para que igual se lea como un campo activo.
            enabled = false,
            singleLine = true,
            isError = error != null,
            supportingText = error?.let { { Text(it) } },
            trailingIcon = {
                Icon(
                    painter = painterResource(R.drawable.ic_arrow_drop_down),
                    contentDescription = null
                )
            },
            colors = OutlinedTextFieldDefaults.colors(
                disabledTextColor = MaterialTheme.colorScheme.onSurface,
                disabledLabelColor = MaterialTheme.colorScheme.onSurfaceVariant,
                disabledBorderColor = MaterialTheme.colorScheme.outline,
                disabledTrailingIconColor = MaterialTheme.colorScheme.onSurfaceVariant
            )
        )
        DropdownMenu(
            expanded = menuAbierto,
            onDismissRequest = { menuAbierto = false },
            modifier = Modifier.heightIn(max = 320.dp)
        ) {
            if (incluirOpcionTodas) {
                DropdownMenuItem(
                    text = { Text(TODAS_LAS_PROVINCIAS) },
                    onClick = {
                        menuAbierto = false
                        onProvinciaElegida(null)
                    }
                )
            }
            PROVINCIAS_ARGENTINA.forEach { nombre ->
                DropdownMenuItem(
                    text = { Text(nombre) },
                    onClick = {
                        menuAbierto = false
                        onProvinciaElegida(nombre)
                    }
                )
            }
        }
    }
}
