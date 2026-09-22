package com.petcare.app.features.ble.domain

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Cubre las pruebas de aceptacion de US-34 (P1-173).
 */
class DetectorDeSeparacionTest {

    @Test
    fun `alejar el tag mas alla del intervalo definido dispara la separacion`() {
        val detector = DetectorDeSeparacion(intervaloSeparacionMillis = 60_000L)
        detector.activarMonitoreo("TAG1", ahoraMillis = 0L)
        detector.registrarLectura("TAG1", ahoraMillis = 5_000L)

        // Ultima lectura en t=5s. En t=64s pasaron 59s desde esa lectura: todavia no.
        assertEquals(EstadoSeparacion.CERCA, detector.evaluar("TAG1", ahoraMillis = 64_000L))

        // En t=66s pasaron 61s: ya se cumplio el intervalo de 60s.
        assertEquals(EstadoSeparacion.SEPARADO, detector.evaluar("TAG1", ahoraMillis = 66_000L))
    }

    @Test
    fun `una interrupcion breve de señal no dispara la deteccion`() {
        val detector = DetectorDeSeparacion(intervaloSeparacionMillis = 60_000L)
        detector.activarMonitoreo("TAG1", ahoraMillis = 0L)

        // Huecos de 40s entre lecturas, uno atras del otro: ninguno solo llega a los
        // 60s del intervalo, y no se acumulan entre si.
        var ahora = 0L
        repeat(5) {
            ahora += 40_000L
            detector.registrarLectura("TAG1", ahoraMillis = ahora)
            assertEquals(EstadoSeparacion.CERCA, detector.evaluar("TAG1", ahoraMillis = ahora))
        }
    }

    @Test
    fun `el monitoreo desactivado no genera detecciones`() {
        val detector = DetectorDeSeparacion(intervaloSeparacionMillis = 60_000L)
        detector.activarMonitoreo("TAG1", ahoraMillis = 0L)

        detector.desactivarMonitoreo("TAG1")

        // Pasaron horas sin lecturas, pero al no estar monitoreado no hay deteccion.
        assertEquals(EstadoSeparacion.CERCA, detector.evaluar("TAG1", ahoraMillis = 999_999_999L))
    }

    @Test
    fun `un tag que nunca se activo tampoco genera detecciones`() {
        val detector = DetectorDeSeparacion(intervaloSeparacionMillis = 60_000L)

        assertEquals(EstadoSeparacion.CERCA, detector.evaluar("TAG-DESCONOCIDO", ahoraMillis = 999_999_999L))
    }

    @Test
    fun `activar el monitoreo no marca separado antes de la primera lectura real`() {
        val detector = DetectorDeSeparacion(intervaloSeparacionMillis = 60_000L)
        detector.activarMonitoreo("TAG1", ahoraMillis = 10_000L)

        // Recien activado: todavia no hay motivo para considerarlo separado.
        assertEquals(EstadoSeparacion.CERCA, detector.evaluar("TAG1", ahoraMillis = 10_500L))
    }

    @Test
    fun `reactivar el monitoreo reinicia el conteo`() {
        val detector = DetectorDeSeparacion(intervaloSeparacionMillis = 60_000L)
        detector.activarMonitoreo("TAG1", ahoraMillis = 0L)
        assertEquals(EstadoSeparacion.SEPARADO, detector.evaluar("TAG1", ahoraMillis = 61_000L))

        detector.activarMonitoreo("TAG1", ahoraMillis = 61_000L)

        assertEquals(EstadoSeparacion.CERCA, detector.evaluar("TAG1", ahoraMillis = 61_500L))
    }

    @Test
    fun `monitorea varias mascotas de forma independiente`() {
        val detector = DetectorDeSeparacion(intervaloSeparacionMillis = 60_000L)
        detector.activarMonitoreo("TAG1", ahoraMillis = 0L)
        detector.activarMonitoreo("TAG2", ahoraMillis = 0L)

        // Solo TAG2 sigue viendose.
        detector.registrarLectura("TAG2", ahoraMillis = 50_000L)

        assertEquals(EstadoSeparacion.SEPARADO, detector.evaluar("TAG1", ahoraMillis = 61_000L))
        assertEquals(EstadoSeparacion.CERCA, detector.evaluar("TAG2", ahoraMillis = 61_000L))
    }

    @Test
    fun `monitoreoActivo refleja si el tag esta siendo vigilado`() {
        val detector = DetectorDeSeparacion()

        assertEquals(false, detector.monitoreoActivo("TAG1"))
        detector.activarMonitoreo("TAG1", ahoraMillis = 0L)
        assertEquals(true, detector.monitoreoActivo("TAG1"))
        detector.desactivarMonitoreo("TAG1")
        assertEquals(false, detector.monitoreoActivo("TAG1"))
    }

    @Test
    fun `separacionNuevaDetectada avisa una sola vez por episodio`() {
        val detector = DetectorDeSeparacion(intervaloSeparacionMillis = 60_000L)
        detector.activarMonitoreo("TAG1", ahoraMillis = 0L)

        // Todavia cerca: no hay nada que avisar.
        assertEquals(false, detector.separacionNuevaDetectada("TAG1", ahoraMillis = 30_000L))

        // Se cumple el intervalo: primera vez que avisa, contesta true.
        assertEquals(true, detector.separacionNuevaDetectada("TAG1", ahoraMillis = 61_000L))

        // Sigue separado, pero del mismo episodio: no vuelve a avisar aunque pase mas tiempo.
        assertEquals(false, detector.separacionNuevaDetectada("TAG1", ahoraMillis = 120_000L))
        assertEquals(false, detector.separacionNuevaDetectada("TAG1", ahoraMillis = 600_000L))
    }

    @Test
    fun `separacionNuevaDetectada vuelve a avisar en un episodio nuevo`() {
        val detector = DetectorDeSeparacion(intervaloSeparacionMillis = 60_000L)
        detector.activarMonitoreo("TAG1", ahoraMillis = 0L)
        assertEquals(true, detector.separacionNuevaDetectada("TAG1", ahoraMillis = 61_000L))

        // La mascota vuelve a estar cerca: cierra el episodio avisado.
        detector.registrarLectura("TAG1", ahoraMillis = 90_000L)
        assertEquals(false, detector.separacionNuevaDetectada("TAG1", ahoraMillis = 90_500L))

        // Se vuelve a separar: es un episodio nuevo, tiene que avisar de nuevo.
        assertEquals(true, detector.separacionNuevaDetectada("TAG1", ahoraMillis = 151_000L))
    }

    @Test
    fun `separacionNuevaDetectada no avisa si el monitoreo esta desactivado`() {
        val detector = DetectorDeSeparacion(intervaloSeparacionMillis = 60_000L)
        detector.activarMonitoreo("TAG1", ahoraMillis = 0L)
        detector.desactivarMonitoreo("TAG1")

        assertEquals(false, detector.separacionNuevaDetectada("TAG1", ahoraMillis = 999_999L))
    }
}
