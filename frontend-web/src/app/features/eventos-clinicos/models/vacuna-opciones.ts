import { TipoVacuna } from './evento-clinico';

export type VacunaOption = {
  value: TipoVacuna;
  label: string;
  especie: string;
};

/**
 * Vacunas que se pueden registrar en un evento de tipo vacuna (US-40).
 *
 * Se muestran todas, con la especie como referencia visual: los formularios
 * tienen el id de la mascota pero no siempre su especie, y traerla solo para
 * filtrar esta lista no justifica el pedido extra. El veterinario sabe cuál
 * corresponde.
 */
export const VACUNA_OPCIONES: VacunaOption[] = [
  { value: 'antirrabica', label: 'Antirrabica', especie: 'perros y gatos' },
  { value: 'quintuple', label: 'Quintuple', especie: 'perros' },
  { value: 'sextuple', label: 'Sextuple', especie: 'perros' },
  { value: 'traqueobronquitis', label: 'Traqueobronquitis', especie: 'perros' },
  { value: 'triple_felina', label: 'Triple felina', especie: 'gatos' },
  { value: 'leucemia_felina', label: 'Leucemia felina', especie: 'gatos' },
];
