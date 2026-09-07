import { IsInt, Min } from 'class-validator';

export class CreateDescarteDto {
  @IsInt()
  @Min(1)
  idPublicacion: number;
}
