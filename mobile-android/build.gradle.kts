import java.util.Properties

// Top-level build file where you can add configuration options common to all sub-projects/modules.
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.compose) apply false
}

val localProperties = Properties().apply {
    val file = rootProject.file("local.properties")

    if (file.exists()) {
        file.inputStream().use { load(it) }
    }
}

localProperties.getProperty("petcare.android.buildDir")
    ?.takeIf { it.isNotBlank() }
    ?.let { buildDirectory ->
        subprojects {
            layout.buildDirectory.set(file("$buildDirectory/$name"))
        }
    }
