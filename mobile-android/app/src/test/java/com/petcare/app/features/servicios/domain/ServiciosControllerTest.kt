package com.petcare.app.features.servicios.domain

import com.petcare.app.features.servicios.data.remote.CreateServicioRequest
import com.petcare.app.features.servicios.data.remote.DisponibilidadRequest
import com.petcare.app.features.servicios.data.remote.DisponibilidadResponse
import com.petcare.app.features.servicios.data.remote.ServicioResponse
import com.petcare.app.features.servicios.data.remote.ServiciosApi
import com.petcare.app.features.servicios.data.remote.UpdateServicioRequest
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ServiciosControllerTest {

    @Test
    fun `getMyServicios devuelve los servicios del prestador autenticado`() =
        runBlocking {
            val controller = ServiciosController(
                serviciosApi = FakeServiciosApi()
            )

            val servicios = controller.getMyServicios()

            assertEquals(2, servicios.size)
            assertEquals("paseador", servicios[0].categoria)
            assertEquals("guarderia", servicios[1].categoria)
        }

    @Test
    fun `createServicio publica un servicio y devuelve la respuesta del backend`() =
        runBlocking {
            val fakeServiciosApi = FakeServiciosApi()
            val controller = ServiciosController(
                serviciosApi = fakeServiciosApi
            )
            val request = CreateServicioRequest(
                categoria = "peluqueria",
                descripcion = "Baño y corte a domicilio",
                disponibilidades = listOf(
                    DisponibilidadRequest(
                        diaSemana = "lunes",
                        horaInicio = "09:00",
                        horaFin = "12:00"
                    )
                )
            )

            val servicio = controller.createServicio(request)

            assertEquals(request, fakeServiciosApi.createdRequest)
            assertEquals("peluqueria", servicio.categoria)
            assertEquals("Baño y corte a domicilio", servicio.descripcion)
            assertEquals(1, servicio.disponibilidades.size)
        }

    @Test
    fun `updateServicio actualiza un servicio y devuelve la respuesta del backend`() =
        runBlocking {
            val fakeServiciosApi = FakeServiciosApi()
            val controller = ServiciosController(
                serviciosApi = fakeServiciosApi
            )
            val request = UpdateServicioRequest(
                categoria = "paseador",
                descripcion = null,
                disponibilidades = listOf(
                    DisponibilidadRequest(
                        diaSemana = "martes",
                        horaInicio = "08:00",
                        horaFin = "10:00"
                    ),
                    DisponibilidadRequest(
                        diaSemana = "jueves",
                        horaInicio = "08:00",
                        horaFin = "10:00"
                    )
                )
            )

            val servicio = controller.updateServicio(5, request)

            assertEquals(5, fakeServiciosApi.updatedId)
            assertEquals(request, fakeServiciosApi.updatedRequest)
            assertEquals("paseador", servicio.categoria)
            assertEquals(2, servicio.disponibilidades.size)
        }

    @Test
    fun `deleteServicio elimina el servicio indicado`() =
        runBlocking {
            val fakeServiciosApi = FakeServiciosApi()
            val controller = ServiciosController(
                serviciosApi = fakeServiciosApi
            )

            controller.deleteServicio(3)

            assertTrue(fakeServiciosApi.deletedIds.contains(3))
        }

    private class FakeServiciosApi : ServiciosApi {
        var createdRequest: CreateServicioRequest? = null
        var updatedId: Int? = null
        var updatedRequest: UpdateServicioRequest? = null
        val deletedIds = mutableListOf<Int>()

        override suspend fun getMyServicios(): List<ServicioResponse> =
            listOf(
                ServicioResponse(
                    id = 1,
                    categoria = "paseador",
                    descripcion = "Paseos por el barrio",
                    disponibilidades = listOf(
                        DisponibilidadResponse(
                            id = 1,
                            diaSemana = "lunes",
                            horaInicio = "09:00",
                            horaFin = "11:00"
                        )
                    )
                ),
                ServicioResponse(
                    id = 2,
                    categoria = "guarderia",
                    descripcion = null,
                    disponibilidades = emptyList()
                )
            )

        override suspend fun createServicio(request: CreateServicioRequest): ServicioResponse {
            createdRequest = request
            return ServicioResponse(
                id = 3,
                categoria = request.categoria,
                descripcion = request.descripcion,
                disponibilidades = request.disponibilidades.mapIndexed { index, disponibilidad ->
                    DisponibilidadResponse(
                        id = index + 1,
                        diaSemana = disponibilidad.diaSemana,
                        horaInicio = disponibilidad.horaInicio,
                        horaFin = disponibilidad.horaFin
                    )
                }
            )
        }

        override suspend fun updateServicio(id: Int, request: UpdateServicioRequest): ServicioResponse {
            updatedId = id
            updatedRequest = request
            return ServicioResponse(
                id = id,
                categoria = request.categoria,
                descripcion = request.descripcion,
                disponibilidades = request.disponibilidades.mapIndexed { index, disponibilidad ->
                    DisponibilidadResponse(
                        id = index + 1,
                        diaSemana = disponibilidad.diaSemana,
                        horaInicio = disponibilidad.horaInicio,
                        horaFin = disponibilidad.horaFin
                    )
                }
            )
        }

        override suspend fun deleteServicio(id: Int) {
            deletedIds.add(id)
        }
    }
}
