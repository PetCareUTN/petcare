package com.petcare.app.features.ble.domain

import java.io.IOException
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import retrofit2.HttpException
import retrofit2.Response

class RechazoDeDeteccionTest {

    private fun http(codigo: Int) =
        HttpException(Response.error<Unit>(codigo, "".toResponseBody()))

    @Test
    fun `un payload invalido se descarta en vez de reintentarse para siempre`() {
        assertTrue(esRechazoDefinitivo(http(400)))
        assertTrue(esRechazoDefinitivo(http(404)))
        assertTrue(esRechazoDefinitivo(http(422)))
    }

    @Test
    fun `sin red se reintenta`() {
        assertFalse(esRechazoDefinitivo(IOException("sin red")))
    }

    @Test
    fun `un error del servidor se reintenta`() {
        assertFalse(esRechazoDefinitivo(http(500)))
        assertFalse(esRechazoDefinitivo(http(503)))
    }

    @Test
    fun `timeout y rate limit se reintentan aunque sean 4xx`() {
        assertFalse(esRechazoDefinitivo(http(408)))
        assertFalse(esRechazoDefinitivo(http(429)))
    }
}
