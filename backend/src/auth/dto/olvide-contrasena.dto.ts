import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';

export class OlvideContrasenaDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(150)
  email!: string;
}
