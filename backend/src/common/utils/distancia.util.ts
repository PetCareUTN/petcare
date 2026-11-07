const RADIO_TIERRA_METROS = 6_371_000;

const aRadianes = (grados: number): number => (grados * Math.PI) / 180;

/**
 * Distancia en metros entre dos puntos, con la fórmula de haversine.
 *
 * Alcanza para las distancias de una zona de casa (cientos de metros): a esa
 * escala el error de tomar la Tierra como esfera es despreciable frente al
 * redondeo de ~110 m que ya traen las detecciones.
 */
export function distanciaEnMetros(
  latitud1: number,
  longitud1: number,
  latitud2: number,
  longitud2: number,
): number {
  const dLat = aRadianes(latitud2 - latitud1);
  const dLon = aRadianes(longitud2 - longitud1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aRadianes(latitud1)) *
      Math.cos(aRadianes(latitud2)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * RADIO_TIERRA_METROS * Math.asin(Math.sqrt(a));
}
