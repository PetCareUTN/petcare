import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleLoginDto {
  /** ID token que devuelve Google en la app (JWT firmado por Google). */
  @IsString()
  @IsNotEmpty()
  idToken: string;
}
