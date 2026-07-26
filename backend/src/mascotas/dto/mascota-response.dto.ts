import { Mascota } from '../entities/mascota.entity';

export class MascotaResponseDto {
  idMascota: number;
  nombre: string;
  idHistoria: number | null;
  especie: string;
  raza: string | null;
  sexo: string;
  fechaNacimiento: string | null;
  peso: number | null;
  esterilizado: boolean;
  foto: string | null;
  observaciones: string | null;
  alergias: string | null;
  idUsuarios: number[];

  static fromEntity(mascota: Mascota): MascotaResponseDto {
    return {
      idMascota: mascota.idMascota,
      nombre: mascota.nombre,
      idHistoria: mascota.idHistoria,
      especie: mascota.especie,
      raza: mascota.raza,
      sexo: mascota.sexo,
      fechaNacimiento: mascota.fechaNacimiento,
      peso: mascota.peso === null ? null : Number(mascota.peso),
      esterilizado: mascota.esterilizado,
      foto: mascota.foto,
      observaciones: mascota.observaciones,
      alergias: mascota.alergias,
      idUsuarios: mascota.usuarios?.map((user) => user.idUsuario) ?? [],
    };
  }
}
