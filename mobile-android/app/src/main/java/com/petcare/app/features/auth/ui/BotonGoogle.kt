package com.petcare.app.features.auth.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.petcare.app.R
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMuted

/** Separador "o" entre el formulario y el ingreso con Google. */
@Composable
fun SeparadorO(modifier: Modifier = Modifier) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        HorizontalDivider(modifier = Modifier.weight(1f), color = PetCareLine)
        Text(
            text = "o",
            color = PetCareMuted,
            style = MaterialTheme.typography.bodyMedium
        )
        HorizontalDivider(modifier = Modifier.weight(1f), color = PetCareLine)
    }
}

/**
 * Botón de ingreso con Google. Sirve tanto para entrar como para registrarse:
 * el backend decide cuál de las dos cosas es según si la cuenta ya existe.
 */
@Composable
fun BotonGoogle(
    texto: String,
    isLoading: Boolean,
    enabled: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    OutlinedButton(
        onClick = onClick,
        modifier = modifier
            .fillMaxWidth()
            .height(52.dp),
        enabled = enabled && !isLoading,
        shape = MaterialTheme.shapes.large,
        border = BorderStroke(1.dp, PetCareLine),
        /*
         * El padding por defecto del botón deja poco lugar y el texto se cortaba
         * en pantallas angostas: lo achicamos para que la etiqueta entre entera.
         */
        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
    ) {
        if (isLoading) {
            CircularProgressIndicator(
                modifier = Modifier.size(22.dp),
                color = MaterialTheme.colorScheme.primary
            )
        } else {
            Icon(
                painter = painterResource(R.drawable.ic_google),
                contentDescription = null,
                modifier = Modifier.size(20.dp),
                // El logo de Google va con sus colores originales.
                tint = Color.Unspecified
            )
            Text(
                text = texto,
                modifier = Modifier.padding(start = 10.dp),
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
                overflow = TextOverflow.Visible,
                style = MaterialTheme.typography.bodyMedium
            )
        }
    }
}
