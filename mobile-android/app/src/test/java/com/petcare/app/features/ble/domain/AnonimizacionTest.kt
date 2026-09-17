package com.petcare.app.features.ble.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AnonimizacionTest {

    @Test
    fun `redondea coordenadas a 3 decimales`() {
        assertEquals(-31.420, redondearCoordenada(-31.4201), 0.0)
        assertEquals(-64.189, redondearCoordenada(-64.1888), 0.0)
    }

    @Test
    fun `el redondeo no filtra el domicilio del detector`() {
        // Dos posiciones a ~40 m una de otra tienen que colapsar al mismo punto, que es
        // justamente el objetivo: la deteccion ubica a la mascota, no al detector.
        val unaEsquina = redondearCoordenada(-31.42012)
        val laDeEnfrente = redondearCoordenada(-31.42035)
        assertEquals(unaEsquina, laDeEnfrente, 0.0)
    }

    @Test
    fun `redondea hacia el valor mas cercano en ambos signos`() {
        assertEquals(1.235, redondearCoordenada(1.23456), 0.0)
        assertEquals(-1.234, redondearCoordenada(-1.2344), 0.0)
        assertEquals(-1.235, redondearCoordenada(-1.23456), 0.0)
        assertEquals(0.0, redondearCoordenada(0.0001), 0.0)
    }

    @Test
    fun `formatea el instante como UTC ISO-8601`() {
        assertEquals("2026-09-17T18:30:00.000Z", formatearInstanteUtc(1789669800000L))
    }

    @Test
    fun `el formato de fecha no depende de la zona horaria del dispositivo`() {
        val enUtc = formatearInstanteUtc(1789669800000L)
        assertTrue("Tiene que terminar en Z", enUtc.endsWith("Z"))
    }

    @Test
    fun `anti repeticion descarta la misma lectura dentro de la ventana`() {
        val anti = AntiRepeticion(ventanaMillis = 55_000L)

        assertTrue(anti.deberiaEnviar("C3BBDE4B02A1", 1_000L))
        // El tag emite cada ~1 s: estas son las repeticiones de la misma ventana.
        assertFalse(anti.deberiaEnviar("C3BBDE4B02A1", 2_000L))
        assertFalse(anti.deberiaEnviar("C3BBDE4B02A1", 3_000L))
    }

    @Test
    fun `anti repeticion vuelve a dejar pasar en el ciclo siguiente`() {
        val anti = AntiRepeticion(ventanaMillis = 55_000L)

        assertTrue(anti.deberiaEnviar("C3BBDE4B02A1", 1_000L))
        assertTrue(anti.deberiaEnviar("C3BBDE4B02A1", 56_000L))
    }

    @Test
    fun `anti repeticion cuenta cada tag por separado`() {
        val anti = AntiRepeticion(ventanaMillis = 55_000L)

        assertTrue(anti.deberiaEnviar("C3BBDE4B02A1", 1_000L))
        // Dos mascotas distintas cerca del mismo detector: las dos tienen que viajar.
        assertTrue(anti.deberiaEnviar("A1B2C3D4E5F6", 1_100L))
    }

    @Test
    fun `olvidar reinicia el anti repeticion`() {
        val anti = AntiRepeticion(ventanaMillis = 55_000L)

        assertTrue(anti.deberiaEnviar("C3BBDE4B02A1", 1_000L))
        anti.olvidar()
        assertTrue(anti.deberiaEnviar("C3BBDE4B02A1", 2_000L))
    }
}
