package com.petcare.app.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.petcare.app.R
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/*
 * El fondo usa el mismo verde que el recuadro de logo_petcare.jpg, asi la
 * imagen se funde con la pantalla y no se ve el borde del archivo.
 */
private val SplashBackground = Color(0xFFAACBC0)

private const val NOMBRE_APP = "PetCare"

/**
 * Pantalla de bienvenida que se muestra al abrir la app: aparece el logo,
 * despues el nombre letra por letra, y al terminar avisa por [onFinished]
 * para que se muestre el login (o el inicio, si la sesion sigue viva).
 */
@Composable
fun SplashScreen(onFinished: () -> Unit) {
    val logoAlpha = remember { Animatable(0f) }
    val logoScale = remember { Animatable(0.82f) }
    val underlineWidth = remember { Animatable(0f) }
    val contenidoAlpha = remember { Animatable(1f) }
    val letrasVisibles = remember { NOMBRE_APP.map { Animatable(0f) } }

    // Evita que un cambio de callback durante la animacion deje el aviso colgado.
    val onFinishedActual by rememberUpdatedState(onFinished)

    LaunchedEffect(Unit) {
        launch {
            logoAlpha.animateTo(1f, tween(durationMillis = 700, easing = LinearOutSlowInEasing))
        }
        launch {
            logoScale.animateTo(1f, tween(durationMillis = 900, easing = FastOutSlowInEasing))
        }

        delay(500)
        letrasVisibles.forEach { letra ->
            launch {
                letra.animateTo(1f, tween(durationMillis = 450, easing = FastOutSlowInEasing))
            }
            // El desfasaje hace que el nombre se vaya "escribiendo".
            delay(70)
        }

        launch {
            underlineWidth.animateTo(1f, tween(durationMillis = 700, easing = FastOutSlowInEasing))
        }

        delay(700)
        contenidoAlpha.animateTo(0f, tween(durationMillis = 450))
        onFinishedActual()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(SplashBackground)
            .alpha(contenidoAlpha.value)
            // Es decorativa: el lector de pantalla no tiene nada que anunciar aca.
            .clearAndSetSemantics { },
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            /*
             * Usamos la version del logo SIN el nombre: el nombre lo animamos
             * aparte, letra por letra. Con logo_petcare (que ya lo trae dibujado)
             * la palabra "PetCare" aparecia dos veces.
             */
            Image(
                painter = painterResource(R.drawable.logo_petcare_simbolo),
                contentDescription = null,
                modifier = Modifier
                    .size(280.dp)
                    .alpha(logoAlpha.value)
                    .scale(logoScale.value)
            )

            Row(
                // El JPG trae aire propio debajo del dibujo: lo compensamos.
                modifier = Modifier.offset(y = (-40).dp)
            ) {
                NOMBRE_APP.forEachIndexed { indice, caracter ->
                    val progreso = letrasVisibles[indice].value

                    Text(
                        text = caracter.toString(),
                        color = Color.White,
                        fontSize = 40.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier
                            .alpha(progreso)
                            .offset(y = ((1f - progreso) * 14f).dp)
                    )
                }
            }

            Box(
                modifier = Modifier
                    .offset(y = (-32).dp)
                    .width((160 * underlineWidth.value).dp)
                    .height(2.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(Color.White.copy(alpha = 0.85f))
            )
        }
    }
}
