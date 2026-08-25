import { IsInt, Min } from 'class-validator';

export class CreateSolicitudAdopcionDto {
  @IsInt()
  @Min(1)
  idPublicacion: number;
}
