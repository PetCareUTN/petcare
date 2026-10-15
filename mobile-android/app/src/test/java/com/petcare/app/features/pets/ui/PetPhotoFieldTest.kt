package com.petcare.app.features.pets.ui

import androidx.compose.ui.geometry.Offset
import org.junit.Assert.assertEquals
import org.junit.Test

class PetPhotoFieldTest {

    @Test
    fun `calcula recorte cuadrado centrado para una imagen horizontal`() {
        val crop = calculateSquareCrop(
            sourceWidth = 1600,
            sourceHeight = 900,
            viewportSize = 300,
            zoom = 1f,
            offset = Offset.Zero
        )

        assertEquals(SquareCrop(left = 350, top = 0, size = 900), crop)
    }

    @Test
    fun `el desplazamiento mueve el recorte sin salir de la imagen`() {
        val crop = calculateSquareCrop(
            sourceWidth = 1600,
            sourceHeight = 900,
            viewportSize = 300,
            zoom = 1f,
            offset = Offset(x = 120f, y = 0f)
        )

        assertEquals(0, crop.top)
        assertEquals(900, crop.size)
        assertEquals(0, crop.left)
    }

    @Test
    fun `normaliza coma y descarta caracteres no numericos del peso`() {
        assertEquals("12.5", normalizeWeightInput("12,5 kg"))
    }

    @Test
    fun `mantiene un solo separador decimal en el peso`() {
        assertEquals("12.34", normalizeWeightInput("12..34"))
    }
}
