package com.petcare.app.features.perdidas.ui

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** Hora con la que arranca el reporte abierto desde el aviso fuera de casa (P1-210). */
class IsoAMillisTest {

    @Test
    fun leeLaFechaIsoQueMandaElBackend() {
        assertEquals(1_793_448_000_000L, isoAMillis("2026-10-31T12:00:00.000Z"))
    }

    @Test
    fun devuelveNullSiLaFechaNoSePuedeLeer() {
        assertNull(isoAMillis("ayer a la tarde"))
    }
}
