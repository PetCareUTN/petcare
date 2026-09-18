package com.petcare.app.features.historiaclinica.domain

/**
 * Convierte a texto plano el HTML que guarda el editor enriquecido de la web.
 *
 * Los campos de texto del evento clinico (descripcion, diagnostico, tratamiento y
 * observaciones) se cargan desde la web con un editor que guarda HTML: negritas,
 * listas, parrafos. La app los mostraba tal cual, asi que al usuario le aparecian
 * los tags a la vista: "<p>Antirrabica anual</p>".
 *
 * Es una funcion pura sobre String, sin dependencias de Android, para poder
 * testearla sin dispositivo. No pretende renderizar el formato —para eso habria
 * que mostrar HTML de verdad— sino que el texto se lea.
 */

/** Entidades HTML que usa el editor. No hace falta cubrirlas todas. */
private val ENTIDADES = mapOf(
    "&nbsp;" to " ",
    "&amp;" to "&",
    "&lt;" to "<",
    "&gt;" to ">",
    "&quot;" to "\"",
    "&#39;" to "'",
    "&apos;" to "'",
)

private val SALTOS_DE_LINEA = Regex("(?i)</(p|div|li|h[1-6])>|<br\\s*/?>")
private val TAGS = Regex("<[^>]*>")
private val LINEAS_VACIAS = Regex("\n{3,}")

/**
 * Devuelve el texto legible de un campo que puede venir con HTML.
 *
 * Si el valor no tiene tags, vuelve practicamente igual: sirve tanto para los
 * eventos cargados desde la web como para los que ya estaban en texto plano.
 */
fun aTextoPlano(html: String): String {
    var texto = html

    // Los cierres de bloque y los <br> son saltos de linea reales; el resto de
    // los tags se descarta. Hacerlo en este orden evita pegar palabras de
    // parrafos distintos.
    texto = SALTOS_DE_LINEA.replace(texto, "\n")
    texto = TAGS.replace(texto, "")

    for ((entidad, caracter) in ENTIDADES) {
        texto = texto.replace(entidad, caracter, ignoreCase = true)
    }

    return texto
        .lines()
        .joinToString("\n") { it.trim() }
        .replace(LINEAS_VACIAS, "\n\n")
        .trim()
}
