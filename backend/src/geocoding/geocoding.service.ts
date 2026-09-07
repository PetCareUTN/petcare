import { Injectable, Logger } from '@nestjs/common';

export interface ResultadoGeocodificacion {
  latitud: number;
  longitud: number;
  /** true si Google no pudo ubicar la dirección con precisión (ver docs). */
  precisionBaja: boolean;
}

interface GeocodingApiResponse {
  status: string;
  results: Array<{
    geometry: {
      location: { lat: number; lng: number };
      location_type: string;
    };
  }>;
}

// location_type de Google: ROOFTOP (exacta) y RANGE_INTERPOLATED (interpolada
// entre dos puntos conocidos) se consideran precisas. GEOMETRIC_CENTER y
// APPROXIMATE (por ejemplo, solo encontró la ciudad) se avisan al usuario.
const UBICACIONES_PRECISAS = new Set(['ROOFTOP', 'RANGE_INTERPOLATED']);

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);

  /**
   * Geocodifica una dirección con la Google Geocoding API.
   *
   * Nunca lanza: si falta la API key, si Google no encuentra resultados o si
   * hay un error de red, devuelve `null` y el alta correspondiente
   * (veterinario o solicitud de prestador) continúa igual, sin coordenadas.
   */
  async geocodificar(
    direccion: string,
  ): Promise<ResultadoGeocodificacion | null> {
    const apiKey = process.env.GOOGLE_GEOCODING_API_KEY;
    if (!apiKey) {
      this.logger.warn(
        'GOOGLE_GEOCODING_API_KEY no configurada; se omite la geocodificación.',
      );
      return null;
    }

    try {
      const url = new URL(
        'https://maps.googleapis.com/maps/api/geocode/json',
      );
      url.searchParams.set('address', direccion);
      url.searchParams.set('key', apiKey);
      // Sesga los resultados hacia Argentina sin restringirlos del todo.
      url.searchParams.set('region', 'ar');

      const response = await fetch(url.toString());
      if (!response.ok) {
        this.logger.warn(`Geocoding API respondió HTTP ${response.status}`);
        return null;
      }

      const data = (await response.json()) as GeocodingApiResponse;
      if (data.status !== 'OK' || data.results.length === 0) {
        this.logger.warn(
          `Geocoding API: estado "${data.status}" para la dirección informada`,
        );
        return null;
      }

      const { location, location_type } = data.results[0].geometry;
      return {
        latitud: location.lat,
        longitud: location.lng,
        precisionBaja: !UBICACIONES_PRECISAS.has(location_type),
      };
    } catch (error) {
      this.logger.error(
        'Error inesperado al geocodificar una dirección',
        error as Error,
      );
      return null;
    }
  }
}
