package com.petcare.app.features.ble.domain

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class FlotaPetCareTest {

    @Test
    fun `el namespace de la flota es el ASCII de PETCAREUTN`() {
        val bytes = hexABytes(NAMESPACE_PETCARE)!!
        assertEquals("PETCAREUTN", String(bytes, Charsets.US_ASCII))
        assertEquals(LARGO_NAMESPACE_BYTES, bytes.size)
    }

    @Test
    fun `normaliza un tagId que ya viene bien`() {
        assertEquals("C3BBDE4B02A1", normalizarTagId("C3BBDE4B02A1"))
    }

    @Test
    fun `normaliza minusculas y separadores`() {
        // Es como lo muestran la app del fabricante y los scanners, asi que es
        // previsible que alguien lo copie y pegue de ahi.
        assertEquals("C3BBDE4B02A1", normalizarTagId("c3bbde4b02a1"))
        assertEquals("C3BBDE4B02A1", normalizarTagId("C3:BB:DE:4B:02:A1"))
        assertEquals("C3BBDE4B02A1", normalizarTagId("c3-bb-de-4b-02-a1"))
        assertEquals("C3BBDE4B02A1", normalizarTagId("  C3BB DE4B 02A1  "))
    }

    @Test
    fun `rechaza tagId con largo incorrecto`() {
        assertNull(normalizarTagId("C3BBDE4B02"))
        assertNull(normalizarTagId("C3BBDE4B02A1FF"))
        assertNull(normalizarTagId(""))
    }

    @Test
    fun `rechaza tagId que no es hexadecimal`() {
        assertNull(normalizarTagId("C3BBDE4B02AZ"))
        assertNull(normalizarTagId("hola mundo!!"))
    }

    @Test
    fun `reconoce un frame de la flota PetCare`() {
        val propio = BeaconFrame.EddystoneUid(
            namespace = NAMESPACE_PETCARE,
            instance = "C3BBDE4B02A1",
            txPower = -18,
        )
        assertTrue(propio.esDeLaFlotaPetCare())
    }

    @Test
    fun `descarta el namespace de fabrica del BC021`() {
        // "bluecharm1": viene igual en todos los tags del fabricante, asi que si no se
        // reconfigura el tag todas las mascotas serian indistinguibles.
        val ajeno = BeaconFrame.EddystoneUid(
            namespace = "626C7565636861726D31",
            instance = "000000000001",
            txPower = -18,
        )
        assertFalse(ajeno.esDeLaFlotaPetCare())
    }

    @Test
    fun `hexABytes convierte y rechaza entradas invalidas`() {
        assertArrayEquals(byteArrayOf(0x00, 0x2A, 0xFF.toByte()), hexABytes("002AFF"))
        assertNull(hexABytes("ABC"))
        assertNull(hexABytes("ZZ"))
    }
}
