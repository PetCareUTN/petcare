package com.petcare.app.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext

private val DarkColorScheme = darkColorScheme(
    primary = PetCareTeal,
    onPrimary = PetCareSurface,
    secondary = PetCareTealSoft,
    onSecondary = PetCareInk,
    tertiary = PetCareWarning,
    background = PetCareDarkBackground,
    onBackground = PetCareSurface,
    surface = PetCareDarkSurface,
    onSurface = PetCareSurface,
    surfaceVariant = PetCareDarkSurface,
    onSurfaceVariant = PetCareTealSoft,
    outline = PetCareMuted,
    error = PetCareError
)

private val LightColorScheme = lightColorScheme(
    primary = PetCareTeal,
    onPrimary = PetCareSurface,
    primaryContainer = PetCareTealSoft,
    onPrimaryContainer = PetCareTealDark,
    secondary = PetCareTealDark,
    onSecondary = PetCareSurface,
    secondaryContainer = PetCareMint,
    onSecondaryContainer = PetCareInk,
    tertiary = PetCareWarning,
    background = PetCareCream,
    onBackground = PetCareInk,
    surface = PetCareSurface,
    onSurface = PetCareInk,
    surfaceVariant = PetCareSurfaceSoft,
    onSurfaceVariant = PetCareMuted,
    outline = PetCareLine,
    error = PetCareError
)

@Composable
fun PetCareTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    // Dynamic color is available on Android 12+
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }

        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
