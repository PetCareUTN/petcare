package com.petcare.app.features.pets.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.TextStyle
import coil3.compose.AsyncImage
import com.petcare.app.features.auth.data.remote.RetrofitClient
import com.petcare.app.ui.theme.PetCareTealDark
import com.petcare.app.ui.theme.PetCareTealSoft

@Composable
fun PetAvatar(
    petName: String,
    photoPath: String?,
    modifier: Modifier = Modifier,
    textStyle: TextStyle = MaterialTheme.typography.titleMedium
) {
    val photoUrl = remember(photoPath) { resolvePetPhotoUrl(photoPath) }

    Surface(
        modifier = modifier.clip(CircleShape),
        shape = CircleShape,
        color = PetCareTealSoft
    ) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = petName.firstOrNull()?.uppercase() ?: "M",
                color = PetCareTealDark,
                style = textStyle
            )

            if (photoUrl != null) {
                AsyncImage(
                    model = photoUrl,
                    contentDescription = "Foto de $petName",
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
            }
        }
    }
}

internal fun resolvePetPhotoUrl(photoPath: String?): String? {
    val normalizedPath = photoPath?.trim()?.takeIf { it.isNotEmpty() } ?: return null
    if (
        normalizedPath.startsWith("http://", ignoreCase = true) ||
        normalizedPath.startsWith("https://", ignoreCase = true)
    ) {
        return normalizedPath
    }

    return "${RetrofitClient.BASE_URL.trimEnd('/')}/${normalizedPath.trimStart('/')}"
}
