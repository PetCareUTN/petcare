package com.petcare.app.ui.components

import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Alto de la barra inferior flotante. El contenido se dibuja por debajo de ella
 * (para que se vea a traves), asi que cada pantalla con scroll suma este valor
 * al final de su contenido y el ultimo elemento se pueda alcanzar. Vale 0 donde
 * no hay barra.
 */
val LocalEspacioBarraInferior = compositionLocalOf<Dp> { 0.dp }
