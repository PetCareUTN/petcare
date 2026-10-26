import { CategoriaServicio } from '../common/enums/categoria-servicio.enum';

export const DURACION_MINIMA_MINUTOS = 15;
export const DURACION_MAXIMA_MINUTOS = 480;

/** Duración que se propone cuando el prestador no elige una. */
export const DURACION_POR_DEFECTO_MINUTOS: Record<CategoriaServicio, number> = {
  [CategoriaServicio.PASEADOR]: 30,
  [CategoriaServicio.PELUQUERIA]: 30,
  [CategoriaServicio.GUARDERIA]: 60,
};
