/**
 * Tipo de franja de la disponibilidad semanal de una veterinaria.
 *
 * Las dos suman capacidad: un dueño puede reservar en cualquiera mientras
 * queden cupos. Se separan para que la veterinaria distinga su horario normal
 * de los sobreturnos (p. ej. "los martes a las 15:00, dos sobreturnos").
 */
export enum TipoDisponibilidad {
  ATENCION = 'atencion',
  SOBRETURNO = 'sobreturno',
}
