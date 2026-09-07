import { IsInt, Min } from 'class-validator';

export class CreateFavoritoDto {
  @IsInt()
  @Min(1)
  idPublicacion: number;
}
