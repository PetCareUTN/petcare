package com.petcare.app.features.adopciones.domain

import com.petcare.app.features.adopciones.data.remote.AdopcionesApi
import com.petcare.app.features.adopciones.data.remote.FiltrosAdopcion
import com.petcare.app.features.adopciones.data.remote.PublicacionAdopcionResponse
import com.petcare.app.features.adopciones.data.remote.PublicarAdopcionRequest

class AdopcionesController(
    private val adopcionesApi: AdopcionesApi
) {

    suspend fun publicar(request: PublicarAdopcionRequest): PublicacionAdopcionResponse =
        adopcionesApi.publicar(request)

    suspend fun listar(filtros: FiltrosAdopcion = FiltrosAdopcion()): List<PublicacionAdopcionResponse> =
        adopcionesApi.listar(
            especie = filtros.especie,
            tamano = filtros.tamano,
            sexo = filtros.sexo,
            esterilizado = filtros.esterilizado,
            vacunado = filtros.vacunado,
            compatiblePerros = filtros.compatiblePerros,
            compatibleGatos = filtros.compatibleGatos,
            compatibleNinos = filtros.compatibleNinos,
            necesitaPatio = filtros.necesitaPatio
        )

    suspend fun listarMias(): List<PublicacionAdopcionResponse> =
        adopcionesApi.listarMias()

    suspend fun obtenerDetalle(idPublicacion: Int): PublicacionAdopcionResponse =
        adopcionesApi.obtenerDetalle(idPublicacion)

    suspend fun cancelar(idPublicacion: Int): PublicacionAdopcionResponse =
        adopcionesApi.cancelar(idPublicacion)

    suspend fun pausar(idPublicacion: Int): PublicacionAdopcionResponse =
        adopcionesApi.pausar(idPublicacion)

    suspend fun reanudar(idPublicacion: Int): PublicacionAdopcionResponse =
        adopcionesApi.reanudar(idPublicacion)
}
