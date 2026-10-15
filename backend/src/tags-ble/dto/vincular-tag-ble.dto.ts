import { Matches } from 'class-validator';

/** Instance ID de Eddystone-UID: 12 caracteres hex, en mayúscula, sin separadores. */
export const TAG_ID_REGEX = /^[0-9A-F]{12}$/;

export class VincularTagBleDto {
  @Matches(TAG_ID_REGEX, {
    message: 'tagId debe ser un instance ID Eddystone-UID válido (12 caracteres hexadecimales en mayúscula, sin separadores)',
  })
  tagId: string;
}
