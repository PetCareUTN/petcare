package com.petcare.app.features.ble.domain

import com.petcare.app.features.ble.data.remote.MensajeResponse
import com.petcare.app.features.ble.data.remote.TagBleResponse
import com.petcare.app.features.ble.data.remote.TagsBleApi
import com.petcare.app.features.ble.data.remote.VincularTagBleRequest

class TagsBleController(
    private val tagsBleApi: TagsBleApi
) {

    suspend fun obtener(idMascota: Int): TagBleResponse? = tagsBleApi.obtener(idMascota).tagBle

    suspend fun vincular(idMascota: Int, tagId: String): TagBleResponse =
        tagsBleApi.vincular(idMascota, VincularTagBleRequest(tagId))

    suspend fun desvincular(idMascota: Int): MensajeResponse =
        tagsBleApi.desvincular(idMascota)
}
