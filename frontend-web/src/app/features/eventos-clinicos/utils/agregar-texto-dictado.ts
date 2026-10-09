/**
 * Agrega texto plano dictado al final del HTML de un editor enriquecido
 * (P1-182), sin perder lo que ya estaba escrito.
 *
 * Con `nuevoParrafo` en false (dictado de un campo) cada frase se suma al
 * último párrafo; el asistente, en cambio, agrega párrafos nuevos. Respeta el
 * límite de caracteres visibles del campo y devuelve null si ya no entra nada.
 */
export function agregarTextoDictado(
  htmlActual: string,
  texto: string,
  maxCaracteres: number,
  nuevoParrafo: boolean,
): string | null {
  const usados = textoVisible(htmlActual).length;
  const disponible = maxCaracteres - usados - (usados > 0 ? 1 : 0);
  if (disponible <= 0) {
    return null;
  }

  const recortado = texto.slice(0, disponible);
  if (!nuevoParrafo && htmlActual.endsWith('</p>')) {
    return `${htmlActual.slice(0, -'</p>'.length)} ${escaparHtml(recortado)}</p>`;
  }

  const parrafos = recortado
    .split('\n')
    .map((linea) => linea.trim())
    .filter(Boolean)
    .map((linea) => `<p>${escaparHtml(capitalizar(linea))}</p>`)
    .join('');
  return htmlActual + parrafos;
}

function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Texto que ve la veterinaria, sin el markup HTML del editor. */
function textoVisible(html: string): string {
  if (!html) {
    return '';
  }
  return new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '';
}
