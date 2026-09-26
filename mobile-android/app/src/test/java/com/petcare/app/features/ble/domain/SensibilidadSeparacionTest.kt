package com.petcare.app.features.ble.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Cubre el umbral configurable de US-35 (P1-174).
 */
class SensibilidadSeparacionTest {

    @Test
    fun `mas sensibilidad avisa antes`() {
        assertTrue(SensibilidadSeparacion.ALTA.intervaloMillis < SensibilidadSeparacion.MEDIA.intervaloMillis)
        assertTrue(SensibilidadSeparacion.MEDIA.intervaloMillis < SensibilidadSeparacion.BAJA.intervaloMillis)
    }

    @Test
    fun `la sensibilidad media mantiene el umbral que ya usaba US-34`() {
        assertEquals(
            DetectorDeSeparacion.INTERVALO_SEPARACION_POR_DEFECTO_MILLIS,
            SensibilidadSeparacion.POR_DEFECTO.intervaloMillis,
        )
    }

    @Test
    fun `ninguna sensibilidad queda por debajo de dos ventanas de escaneo`() {
        SensibilidadSeparacion.entries.forEach {
            assertTrue(it.intervaloMillis >= 2 * MotorEscaneoBle.INTERVALO_ESCANEO_MILLIS)
        }
    }

    @Test
    fun `con un escaneo mas espaciado el umbral efectivo se estira`() {
        // Escaneando cada 3 min, avisar a los 2 dispararia entre dos ventanas.
        assertEquals(360_000L, SensibilidadSeparacion.ALTA.intervaloEfectivoMillis(180_000L))
        // Con el escaneo por defecto (60 s) se respeta el umbral elegido.
        assertEquals(120_000L, SensibilidadSeparacion.ALTA.intervaloEfectivoMillis(60_000L))
    }

    @Test
    fun `un valor guardado desconocido o ausente cae en el por defecto`() {
        assertEquals(SensibilidadSeparacion.MEDIA, SensibilidadSeparacion.desdeNombre(null))
        assertEquals(SensibilidadSeparacion.MEDIA, SensibilidadSeparacion.desdeNombre("MUY_ALTA"))
        assertEquals(SensibilidadSeparacion.BAJA, SensibilidadSeparacion.desdeNombre("BAJA"))
    }
}
