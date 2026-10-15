package com.petcare.app.features.historiaclinica.domain

import org.junit.Assert.assertEquals
import org.junit.Test

class TextoEnriquecidoTest {

    @Test
    fun `saca los tags de parrafo que mostraba la app`() {
        assertEquals(
            "Antirrabica anual, sin reacciones adversas",
            aTextoPlano("<p>Antirrabica anual, sin reacciones adversas</p>"),
        )
    }

    @Test
    fun `no toca el texto que ya venia plano`() {
        // Los eventos sembrados a mano no pasaron por el editor de la web.
        assertEquals(
            "Extraccion de cuerpo extrano",
            aTextoPlano("Extraccion de cuerpo extrano"),
        )
    }

    @Test
    fun `separa los parrafos en lugar de pegarlos`() {
        assertEquals(
            "Primera consulta\nSegunda consulta",
            aTextoPlano("<p>Primera consulta</p><p>Segunda consulta</p>"),
        )
    }

    @Test
    fun `convierte los saltos de linea del editor`() {
        assertEquals("Linea uno\nLinea dos", aTextoPlano("Linea uno<br>Linea dos"))
        assertEquals("Linea uno\nLinea dos", aTextoPlano("Linea uno<br/>Linea dos"))
    }

    @Test
    fun `mantiene el texto de las listas, una por linea`() {
        assertEquals(
            "Ayuno 12 horas\nControl en 7 dias",
            aTextoPlano("<ul><li>Ayuno 12 horas</li><li>Control en 7 dias</li></ul>"),
        )
    }

    @Test
    fun `saca el formato pero deja el contenido`() {
        assertEquals(
            "Dosis anual obligatoria",
            aTextoPlano("<p><strong>Dosis anual</strong> <em>obligatoria</em></p>"),
        )
    }

    @Test
    fun `traduce las entidades HTML`() {
        assertEquals("Perro & gato", aTextoPlano("<p>Perro &amp; gato</p>"))
        assertEquals("Peso < 10 kg", aTextoPlano("<p>Peso &lt; 10 kg</p>"))
        assertEquals("Control cada 6 meses", aTextoPlano("<p>Control&nbsp;cada 6 meses</p>"))
    }

    @Test
    fun `no deja lineas vacias de mas`() {
        assertEquals(
            "Primera\n\nSegunda",
            aTextoPlano("<p>Primera</p><p></p><p></p><p>Segunda</p>"),
        )
    }

    @Test
    fun `un campo vacio sigue vacio`() {
        assertEquals("", aTextoPlano(""))
        assertEquals("", aTextoPlano("<p></p>"))
    }
}
