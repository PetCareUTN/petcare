import { IsEmail, IsNotEmpty} from 'class-validator';

export class OlvideContrasenaDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

}
