package com.petcare.app.features.pets.ui

import com.petcare.app.features.auth.data.remote.RetrofitClient
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class PetAvatarTest {

    @Test
    fun `relative photo path is resolved against api base url`() {
        val expected = "${RetrofitClient.BASE_URL.trimEnd('/')}/uploads/mascotas/luna.jpg"

        assertEquals(expected, resolvePetPhotoUrl("/uploads/mascotas/luna.jpg"))
        assertEquals(expected, resolvePetPhotoUrl("uploads/mascotas/luna.jpg"))
    }

    @Test
    fun `absolute photo url is preserved`() {
        val photoUrl = "https://cdn.example.com/mascotas/luna.jpg"

        assertEquals(photoUrl, resolvePetPhotoUrl(photoUrl))
    }

    @Test
    fun `missing photo returns null`() {
        assertNull(resolvePetPhotoUrl(null))
        assertNull(resolvePetPhotoUrl("   "))
    }
}
