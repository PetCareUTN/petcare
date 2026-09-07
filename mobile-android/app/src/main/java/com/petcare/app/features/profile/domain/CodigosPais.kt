package com.petcare.app.features.profile.domain

/**
 * El contacto entre dueño e interesado se hace por WhatsApp, que necesita el
 * número en formato internacional. Por eso el teléfono se carga separado en
 * código de país + número local, y se guarda como "+54 3511234567".
 */
data class CodigoPais(
    val codigo: String,
    val pais: String,
    val bandera: String
) {
    val etiqueta: String get() = "$bandera $codigo"
}

val CODIGOS_PAIS = listOf(
    CodigoPais("+54", "Argentina", "🇦🇷"),
    CodigoPais("+598", "Uruguay", "🇺🇾"),
    CodigoPais("+56", "Chile", "🇨🇱"),
    CodigoPais("+595", "Paraguay", "🇵🇾"),
    CodigoPais("+591", "Bolivia", "🇧🇴"),
    CodigoPais("+55", "Brasil", "🇧🇷"),
    CodigoPais("+51", "Perú", "🇵🇪"),
    CodigoPais("+57", "Colombia", "🇨🇴"),
    CodigoPais("+52", "México", "🇲🇽"),
    CodigoPais("+34", "España", "🇪🇸"),
    CodigoPais("+1", "Estados Unidos", "🇺🇸")
)

val CODIGO_PAIS_POR_DEFECTO = CODIGOS_PAIS.first()

/**
 * Separa un teléfono guardado en (código de país, número local). Los números
 * viejos, cargados antes de pedir el código, caen en el país por defecto.
 */
fun separarTelefono(telefono: String?): Pair<CodigoPais, String> {
    val limpio = telefono?.trim().orEmpty()
    if (!limpio.startsWith("+")) {
        return CODIGO_PAIS_POR_DEFECTO to limpio.filter { it.isDigit() }
    }

    val soloDigitos = limpio.filter { it.isDigit() }
    // Los códigos más largos primero: "+598" antes que "+5".
    val codigo = CODIGOS_PAIS
        .sortedByDescending { it.codigo.length }
        .firstOrNull { soloDigitos.startsWith(it.codigo.drop(1)) }
        ?: return CODIGO_PAIS_POR_DEFECTO to soloDigitos

    return codigo to soloDigitos.drop(codigo.codigo.length - 1)
}

fun unirTelefono(codigo: CodigoPais, numeroLocal: String): String =
    "${codigo.codigo} ${numeroLocal.filter { it.isDigit() }}"
