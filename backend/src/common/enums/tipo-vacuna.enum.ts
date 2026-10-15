/**
 * Vacunas que el veterinario puede registrar en la historia clínica (US-40).
 *
 * Es una lista cerrada y no texto libre a propósito: el recordatorio necesita
 * comparar dos registros y saber que son la misma vacuna, para no avisar por una
 * dosis que el dueño ya aplicó. Con texto libre, "antirrábica" y "Antirrabica"
 * serían vacunas distintas y ese criterio de aceptación no se podría cumplir.
 *
 * No incluye una opción "otra": una vacuna fuera de esta lista se puede registrar
 * igual como evento clínico común, pero no genera recordatorio. Es preferible a que
 * el dueño crea que le vamos a avisar y no le avisemos.
 */
export enum TipoVacuna {
  // Caninas
  QUINTUPLE = 'quintuple',
  SEXTUPLE = 'sextuple',
  TRAQUEOBRONQUITIS = 'traqueobronquitis',

  // Felinas
  TRIPLE_FELINA = 'triple_felina',
  LEUCEMIA_FELINA = 'leucemia_felina',

  // Ambas especies
  ANTIRRABICA = 'antirrabica',
}
