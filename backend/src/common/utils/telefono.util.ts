/**
 * El contacto entre dueño e interesado se hace por WhatsApp, que necesita el
 * número en formato internacional. Un número sin código de país no sirve.
 */
export function tieneCodigoPais(telefono?: string | null): boolean {
  if (!telefono) {
    return false;
  }

  const limpio = telefono.trim();
  if (!limpio.startsWith('+')) {
    return false;
  }

  return limpio.replace(/\D/g, '').length >= 8;
}

export const MENSAJE_TELEFONO_REQUERIDO =
  'Necesitás cargar un teléfono con código de país en tu perfil para usar adopciones';
