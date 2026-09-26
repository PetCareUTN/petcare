import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
}

// La API key de Maps SDK for Android no se commitea: se lee de local.properties
// (gitignored) igual que sdk.dir. Si falta, se deja un placeholder inválido para
// que el build no rompa, pero el mapa no va a cargar tiles hasta configurarla.
val localProperties = Properties().apply {
    val localPropertiesFile = rootProject.file("local.properties")
    if (localPropertiesFile.exists()) {
        localPropertiesFile.inputStream().use { load(it) }
    }
}
val mapsApiKey: String = localProperties.getProperty("MAPS_API_KEY") ?: "change_me"

// URL del backend por variante. La de release se puede pisar sin tocar el
// repo, para compilar contra staging o contra un backend propio:
//   ./gradlew assembleRelease -PPETCARE_API_URL=https://loquesea/
// o poniendo PETCARE_API_URL en local.properties. Ver docs/deploy.md.
fun apiUrl(porDefecto: String): String =
    (project.findProperty("PETCARE_API_URL") as String?)
        ?: localProperties.getProperty("PETCARE_API_URL")
        ?: porDefecto

// Desde el emulador Android, 10.0.2.2 representa la computadora donde corre el
// emulador: es el backend levantado con npm run start:dev.
val API_URL_LOCAL = "http://10.0.2.2:3000/"

// TODO: reemplazar por el dominio real del backend en Railway apenas se cree
// el servicio de produccion. Tiene que terminar en barra (lo exige Retrofit).
val API_URL_PRODUCCION = "https://petcare-backend-production.up.railway.app/"

android {
    namespace = "com.petcare.app"
    compileSdk {
        version = release(36) {
            minorApiLevel = 1
        }
    }

    defaultConfig {
        applicationId = "com.petcare.app"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        manifestPlaceholders["mapsApiKey"] = mapsApiKey
    }

    buildTypes {
        debug {
            buildConfigField("String", "API_BASE_URL", "\"${apiUrl(API_URL_LOCAL)}\"")
            // El backend local habla HTTP plano; sin esto Android bloquea las
            // llamadas desde el emulador.
            manifestPlaceholders["usesCleartextTraffic"] = "true"
        }
        release {
            buildConfigField("String", "API_BASE_URL", "\"${apiUrl(API_URL_PRODUCCION)}\"")
            // En produccion todo va por HTTPS: si algo quedo apuntando a http://
            // queremos que falle en desarrollo y no que viaje en texto plano.
            manifestPlaceholders["usesCleartextTraffic"] = "false"
            optimization {
                enable = false
            }
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    buildFeatures {
        compose = true
        // Necesario para que se genere BuildConfig con API_BASE_URL.
        buildConfig = true
    }
    testOptions {
        unitTests {
            // Sin esto, cualquier llamada a android.util.Log desde código testeado
            // revienta con "Method w in android.util.Log not mocked". Con el flag,
            // los métodos del framework devuelven su valor por defecto y no estorban.
            isReturnDefaultValues = true
        }
    }
}

dependencies {
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    testImplementation(libs.junit)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(libs.androidx.junit)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
    debugImplementation(libs.androidx.compose.ui.tooling)
    implementation(libs.retrofit)
    implementation(libs.retrofit.converter.gson)
    implementation(libs.coil.compose)
    implementation(libs.coil.network.okhttp)
    // Ingreso con Google (Credential Manager, el reemplazo de GoogleSignIn).
    implementation(libs.androidx.credentials)
    implementation(libs.androidx.credentials.play.services.auth)
    implementation(libs.googleid)
    // Mapa con pines de veterinarias/prestadores cercanos + ubicación del usuario.
    implementation(libs.play.services.maps)
    implementation(libs.play.services.location)
    implementation(libs.maps.compose)
    implementation(libs.accompanist.permissions)
}
