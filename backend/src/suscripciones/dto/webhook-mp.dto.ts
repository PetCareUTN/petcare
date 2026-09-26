import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * DTO para los datos que envía Mercado Pago al webhook.
 * MP puede enviar la información como query params o en el body JSON,
 * por eso todos los campos son opcionales.
 */
export class WebhookMpDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  data?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  'data.id'?: string;

  @IsOptional()
  @IsString()
  id?: string;
}
