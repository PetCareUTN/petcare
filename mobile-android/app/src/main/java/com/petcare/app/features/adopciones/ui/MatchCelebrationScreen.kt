package com.petcare.app.features.adopciones.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.petcare.app.R
import com.petcare.app.features.pets.ui.resolvePetPhotoUrl
import com.petcare.app.ui.theme.PetCareError
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.ui.theme.PetCareTeal
import com.petcare.app.ui.theme.PetCareTealSoft
import com.petcare.app.ui.theme.PetCareWarning
import kotlin.random.Random

private const val CANTIDAD_CONFETI = 45
private const val DURACION_CONFETI_MS = 3000

@Composable
fun MatchCelebrationScreen(
    nombreMascota: String,
    fotoMascota: String?,
    onContinuar: () -> Unit
) {
    val escalaFoto = remember { Animatable(0f) }
    val alphaTitulo = remember { Animatable(0f) }
    val alphaTexto = remember { Animatable(0f) }
    val alphaBoton = remember { Animatable(0f) }

    LaunchedEffect(Unit) {
        escalaFoto.animateTo(
            targetValue = 1f,
            animationSpec = spring(
                dampingRatio = Spring.DampingRatioMediumBouncy,
                stiffness = Spring.StiffnessLow
            )
        )
    }
    LaunchedEffect(Unit) {
        alphaTitulo.animateTo(1f, tween(durationMillis = 400, delayMillis = 250))
        alphaTexto.animateTo(1f, tween(durationMillis = 350))
        alphaBoton.animateTo(1f, tween(durationMillis = 350))
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(PetCareTealSoft)
    ) {
        LluviaDeConfeti()

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            FotoConCorazon(
                nombreMascota = nombreMascota,
                fotoMascota = fotoMascota,
                escala = escalaFoto.value
            )

            Spacer(modifier = Modifier.height(28.dp))

            Text(
                text = "¡Hay match!",
                modifier = Modifier.alpha(alphaTitulo.value),
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(10.dp))

            Text(
                text = "$nombreMascota y vos pueden conocerse.",
                modifier = Modifier.alpha(alphaTexto.value),
                style = MaterialTheme.typography.titleMedium,
                textAlign = TextAlign.Center
            )
            Text(
                text = "Aceptaste la solicitud de adopción; ahora pueden coordinar los próximos pasos.",
                modifier = Modifier.alpha(alphaTexto.value),
                color = PetCareMuted,
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(28.dp))

            Button(
                onClick = onContinuar,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .alpha(alphaBoton.value),
                shape = MaterialTheme.shapes.large
            ) {
                Text("CONTINUAR")
            }
        }
    }
}

@Composable
private fun FotoConCorazon(
    nombreMascota: String,
    fotoMascota: String?,
    escala: Float
) {
    val latido = rememberInfiniteTransition(label = "latido")
    val escalaCorazon by latido.animateFloat(
        initialValue = 0.88f,
        targetValue = 1.12f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 700),
            repeatMode = RepeatMode.Reverse
        ),
        label = "escalaCorazon"
    )
    val fotoUrl = remember(fotoMascota) { resolvePetPhotoUrl(fotoMascota) }

    Box(contentAlignment = Alignment.BottomCenter) {
        Box(
            modifier = Modifier
                .scale(escala)
                .size(180.dp)
                .clip(CircleShape)
                .background(PetCareTealSoft)
                .border(5.dp, Color.White, CircleShape),
            contentAlignment = Alignment.Center
        ) {
            if (fotoUrl != null) {
                AsyncImage(
                    model = fotoUrl,
                    contentDescription = nombreMascota,
                    modifier = Modifier
                        .fillMaxSize()
                        .clip(CircleShape),
                    contentScale = ContentScale.Crop
                )
            } else {
                Text(text = "🐾", style = MaterialTheme.typography.displayMedium)
            }
        }

        Surface(
            modifier = Modifier
                .scale(escala * escalaCorazon)
                .size(64.dp),
            shape = CircleShape,
            color = Color.White
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    painter = painterResource(R.drawable.ic_heart),
                    contentDescription = null,
                    tint = PetCareError,
                    modifier = Modifier.size(32.dp)
                )
            }
        }
    }
}

/** Papelitos que caen una sola vez al abrirse la pantalla. */
@Composable
private fun LluviaDeConfeti() {
    val colores = listOf(PetCareTeal, PetCareWarning, PetCareError, Color.White)
    val papelitos = remember {
        List(CANTIDAD_CONFETI) {
            val random = Random.Default
            Papelito(
                xRelativo = random.nextFloat(),
                retraso = random.nextFloat() * 0.35f,
                velocidad = 0.9f + random.nextFloat() * 0.5f,
                color = colores[random.nextInt(colores.size)],
                ancho = 10f + random.nextFloat() * 10f,
                giros = 1f + random.nextFloat() * 3f
            )
        }
    }
    val progreso = remember { Animatable(0f) }

    LaunchedEffect(Unit) {
        progreso.animateTo(1f, tween(DURACION_CONFETI_MS, easing = LinearEasing))
    }

    if (progreso.value >= 1f) return

    Canvas(modifier = Modifier.fillMaxSize()) {
        papelitos.forEach { papelito ->
            val avance =
                ((progreso.value - papelito.retraso) / (1f - papelito.retraso)).coerceIn(0f, 1f)
            if (avance <= 0f) return@forEach

            val x = papelito.xRelativo * size.width
            val y = avance * papelito.velocidad * (size.height + 120f) - 60f
            rotate(degrees = avance * papelito.giros * 360f, pivot = Offset(x, y)) {
                drawRect(
                    color = papelito.color,
                    topLeft = Offset(x - papelito.ancho / 2f, y - papelito.ancho / 2f),
                    size = Size(papelito.ancho, papelito.ancho * 1.6f)
                )
            }
        }
    }
}

private data class Papelito(
    val xRelativo: Float,
    val retraso: Float,
    val velocidad: Float,
    val color: Color,
    val ancho: Float,
    val giros: Float
)
