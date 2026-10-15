package com.petcare.app.features.historiaclinica.domain

import com.petcare.app.features.historiaclinica.data.remote.EventoClinicoResponse
import com.petcare.app.features.historiaclinica.data.remote.HistoriaClinicaApi
import com.petcare.app.features.historiaclinica.data.remote.HistoriaClinicaResponse
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class HistoriaClinicaControllerTest {

    @Test
    fun `getHistoriaClinica devuelve los eventos ordenados que trae el backend`() =
        runBlocking {
            val controller = HistoriaClinicaController(
                historiaClinicaApi = FakeHistoriaClinicaApi()
            )

            val historia = controller.getHistoriaClinica(10)

            assertEquals(10, historia.idMascota)
            assertEquals(1, historia.eventos.size)
            assertEquals("consulta", historia.eventos[0].tipo)
        }

    @Test
    fun `getHistoriaClinica devuelve una historia vacia sin eventos`() =
        runBlocking {
            val controller = HistoriaClinicaController(
                historiaClinicaApi = FakeHistoriaClinicaApi(vacia = true)
            )

            val historia = controller.getHistoriaClinica(11)

            assertTrue(historia.eventos.isEmpty())
        }

    private class FakeHistoriaClinicaApi(
        private val vacia: Boolean = false
    ) : HistoriaClinicaApi {
        override suspend fun getHistoriaClinica(idMascota: Int): HistoriaClinicaResponse =
            if (vacia) {
                HistoriaClinicaResponse(
                    idHistoria = null,
                    idMascota = idMascota,
                    fechaCreacion = null,
                    eventos = emptyList()
                )
            } else {
                HistoriaClinicaResponse(
                    idHistoria = 20,
                    idMascota = idMascota,
                    fechaCreacion = "2026-07-01",
                    eventos = listOf(
                        EventoClinicoResponse(
                            idEvento = 30,
                            idHistoria = 20,
                            idMascota = idMascota,
                            idVeterinario = 4,
                            tipo = "consulta",
                            fecha = "2026-07-31",
                            descripcion = "Consulta por tos persistente",
                            diagnostico = "Bronquitis leve",
                            tratamiento = "Reposo y control",
                            observaciones = null,
                            createdAt = "2026-07-31T10:00:00Z",
                            updatedAt = "2026-07-31T10:00:00Z"
                        )
                    )
                )
            }
    }
}
