import { IsString, Matches } from 'class-validator';

/** Mismo formato que el resto del contrato BLE: 12 caracteres hex en mayúscula. */
const TAG_ID_HEX = /^[0-9A-F]{12}$/;

export class AvisarSeparacionDto {
  @IsString()
  @Matches(TAG_ID_HEX, {
    message: 'tagId debe ser el instance ID de Eddystone-UID: 12 hex en mayúscula',
  })
  tagId: string;
}
