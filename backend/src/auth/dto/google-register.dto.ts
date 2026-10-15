import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class GoogleRegisterDto {
  /** El mismo ID token del paso anterior: se vuelve a validar antes de crear la cuenta. */
  @IsString()
  @IsNotEmpty()
  idToken: string;

  // Google no entrega el documento, por eso se pide en el paso de completar registro.
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{7,8}$/, {
    message: 'El DNI debe contener 7 u 8 números',
  })
  numeroDocumento: string;
}
