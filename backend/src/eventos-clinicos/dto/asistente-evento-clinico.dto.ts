import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ClinicalEventType } from '../../common/enums/clinical-event-type.enum';
import { TipoVacuna } from '../../common/enums/tipo-vacuna.enum';

/**
 * Una consulta dictada de varios minutos entra holgada. El límite evita que
 * alguien le pegue directo a la API con textos enormes y gaste crédito de IA.
 */
const TRANSCRIPCION_MAX_LENGTH = 6000;

export class AsistenteEventoClinicoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(TRANSCRIPCION_MAX_LENGTH)
  transcripcion: string;
}

/**
 * Campos sugeridos para el formulario de evento clínico (P1-182).
 *
 * Es solo una sugerencia: el frontend la vuelca en el formulario y la
 * veterinaria la revisa antes de guardar. null significa que la consulta
 * dictada no mencionaba ese dato y el campo se deja como estaba.
 */
export class SugerenciaEventoClinicoDto {
  tipo: ClinicalEventType | null;
  descripcion: string | null;
  diagnostico: string | null;
  tratamiento: string | null;
  observaciones: string | null;
  vacuna: TipoVacuna | null;
}
