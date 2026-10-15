package com.petcare.app.features.ble.data.local

import com.petcare.app.features.ble.data.remote.DeteccionRequest
import java.io.File
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * La cola es lo que sostiene el "detectar aunque no haya red" de US-30, asi que
 * conviene tenerla cubierta sin depender de un dispositivo.
 */
class ColaDeDeteccionesTest {

    private lateinit var archivo: File

    @Before
    fun crearArchivoTemporal() {
        archivo = File.createTempFile("detecciones", ".jsonl").apply { delete() }
    }

    @After
    fun borrarArchivoTemporal() {
        archivo.delete()
    }

    private fun deteccion(id: String, tagId: String = "C3BBDE4B02A1") = DeteccionRequest(
        deteccionId = id,
        tagId = tagId,
        rssi = -60,
        detectadoEn = "2026-09-17T18:30:00.000Z",
        latitud = -31.420,
        longitud = -64.189,
        precisionMetros = 25,
    )

    @Test
    fun `una cola nueva esta vacia`() {
        assertTrue(ColaDeDetecciones(archivo).pendientes().isEmpty())
    }

    @Test
    fun `conserva las detecciones en orden, de la mas vieja a la mas nueva`() {
        val cola = ColaDeDetecciones(archivo)
        cola.encolar(deteccion("a"))
        cola.encolar(deteccion("b"))
        cola.encolar(deteccion("c"))

        assertEquals(listOf("a", "b", "c"), cola.pendientes().map { it.deteccionId })
    }

    @Test
    fun `sobrevive a una instancia nueva, que es lo que pasa si muere el proceso`() {
        ColaDeDetecciones(archivo).encolar(deteccion("a"))

        val otra = ColaDeDetecciones(archivo)
        assertEquals(listOf("a"), otra.pendientes().map { it.deteccionId })
    }

    @Test
    fun `el payload se guarda y se recupera completo`() {
        val cola = ColaDeDetecciones(archivo)
        val original = deteccion("a")
        cola.encolar(original)

        assertEquals(original, cola.pendientes().single())
    }

    @Test
    fun `quitar saca solo las enviadas`() {
        val cola = ColaDeDetecciones(archivo)
        listOf("a", "b", "c").forEach { cola.encolar(deteccion(it)) }

        cola.quitar(setOf("a", "c"))

        assertEquals(listOf("b"), cola.pendientes().map { it.deteccionId })
    }

    @Test
    fun `quitar todo deja la cola vacia`() {
        val cola = ColaDeDetecciones(archivo)
        listOf("a", "b").forEach { cola.encolar(deteccion(it)) }

        cola.quitar(setOf("a", "b"))

        assertTrue(cola.pendientes().isEmpty())
    }

    @Test
    fun `quitar con un conjunto vacio no toca nada`() {
        val cola = ColaDeDetecciones(archivo)
        cola.encolar(deteccion("a"))

        cola.quitar(emptySet())

        assertEquals(listOf("a"), cola.pendientes().map { it.deteccionId })
    }

    @Test
    fun `al llegar al maximo descarta las mas viejas`() {
        // Una deteccion de hace horas ya no ayuda a encontrar una mascota que se mueve;
        // la ultima si.
        val cola = ColaDeDetecciones(archivo, maximo = 3)
        listOf("a", "b", "c", "d", "e").forEach { cola.encolar(deteccion(it)) }

        assertEquals(listOf("c", "d", "e"), cola.pendientes().map { it.deteccionId })
    }

    @Test
    fun `ignora las lineas corruptas en vez de perder toda la cola`() {
        val cola = ColaDeDetecciones(archivo)
        cola.encolar(deteccion("a"))
        archivo.appendText("{ esto no es json valido\n")
        cola.encolar(deteccion("b"))

        assertEquals(listOf("a", "b"), cola.pendientes().map { it.deteccionId })
    }

    @Test
    fun `vaciar borra todo`() {
        val cola = ColaDeDetecciones(archivo)
        cola.encolar(deteccion("a"))

        cola.vaciar()

        assertTrue(cola.pendientes().isEmpty())
        assertFalse(archivo.exists())
    }
}
