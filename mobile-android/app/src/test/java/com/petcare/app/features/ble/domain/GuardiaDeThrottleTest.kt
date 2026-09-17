package com.petcare.app.features.ble.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * El limite que se modela aca es el de Android: mas de 5 `startScan()` en 30 segundos y
 * la app queda bloqueada **en silencio**, sin `onScanFailed`.
 */
class GuardiaDeThrottleTest {

    @Test
    fun `deja arrancar mientras no se llegue al maximo`() {
        val guardia = GuardiaDeThrottle(maximoInicios = 4, ventanaMillis = 30_000L)

        var ahora = 1_000L
        repeat(4) {
            assertEquals(0L, guardia.esperaNecesariaMillis(ahora))
            guardia.registrarInicio(ahora)
            ahora += 1_000L
        }
    }

    @Test
    fun `al llegar al maximo obliga a esperar`() {
        val guardia = GuardiaDeThrottle(maximoInicios = 4, ventanaMillis = 30_000L)

        // Cuatro inicios en los primeros 3 segundos.
        listOf(1_000L, 2_000L, 3_000L, 4_000L).forEach { guardia.registrarInicio(it) }

        // En t=5s el mas viejo (t=1s) todavia esta dentro de la ventana: hay que esperar
        // a que salga, o sea hasta t=31s.
        assertEquals(26_000L, guardia.esperaNecesariaMillis(5_000L))
    }

    @Test
    fun `una vez que el mas viejo sale de la ventana vuelve a dejar arrancar`() {
        val guardia = GuardiaDeThrottle(maximoInicios = 4, ventanaMillis = 30_000L)
        listOf(1_000L, 2_000L, 3_000L, 4_000L).forEach { guardia.registrarInicio(it) }

        assertEquals(0L, guardia.esperaNecesariaMillis(31_001L))
    }

    @Test
    fun `reiniciar olvida el historial`() {
        val guardia = GuardiaDeThrottle(maximoInicios = 4, ventanaMillis = 30_000L)
        listOf(1_000L, 2_000L, 3_000L, 4_000L).forEach { guardia.registrarInicio(it) }
        assertTrue(guardia.esperaNecesariaMillis(5_000L) > 0)

        guardia.reiniciar()

        assertEquals(0L, guardia.esperaNecesariaMillis(5_000L))
    }

    @Test
    fun `el intervalo por defecto del duty cycling no puede disparar el bloqueo`() {
        // Con el intervalo minimo, cuantos inicios entran en la ventana de 30 s.
        val iniciosEnLaVentana =
            GuardiaDeThrottle.VENTANA_MILLIS / GuardiaDeThrottle.INTERVALO_MINIMO_MILLIS

        assertTrue(
            "El intervalo minimo permite $iniciosEnLaVentana inicios en 30 s, " +
                "por encima del maximo de ${GuardiaDeThrottle.MAXIMO_INICIOS}",
            iniciosEnLaVentana <= GuardiaDeThrottle.MAXIMO_INICIOS,
        )
    }

    @Test
    fun `los valores por defecto dejan margen contra el limite real de Android`() {
        // Android bloquea a partir de 5; el guardia corta en 4 a proposito.
        assertTrue(GuardiaDeThrottle.MAXIMO_INICIOS < 5)
    }
}
