package com.petcare.app.ui.components

import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ButtonElevation
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CardElevation
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp

/*
 * Sombra común de la app: la misma en todas las tarjetas y botones, para que
 * se vean "apoyados" sobre el fondo en vez de planos. Está en un solo lugar
 * para poder subirla o bajarla de golpe.
 */

/** Sombra de las tarjetas. */
@Composable
fun elevacionTarjeta(): CardElevation = CardDefaults.cardElevation(defaultElevation = 3.dp)

/** Sombra de los botones; se hunde un poco al apretarlos. */
@Composable
fun elevacionBoton(): ButtonElevation = ButtonDefaults.buttonElevation(
    defaultElevation = 3.dp,
    pressedElevation = 1.dp,
    focusedElevation = 3.dp,
    hoveredElevation = 4.dp
)
