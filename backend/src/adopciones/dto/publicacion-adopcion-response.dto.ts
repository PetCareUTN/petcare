import { PublicacionAdopcion } from '../entities/publicacion-adopcion.entity';

/**
 * Datos visibles de la mascota dentro de una publicación de adopción. No
 * incluye información sensible del dueño ni datos médicos (alergias,
 * observaciones), que quedan protegidos por privacidad.
 */
export class MascotaAdopcionDto {
  idMascota: number;
  nombre: string;
  especie: string;
  raza: string | null;
  sexo: string;
  fechaNacimiento: string | null;
  foto: string | null;
}

export class PublicacionAdopcionResponseDto {
  idPublicacion: number;
  estado: string;
  descripcion: string;
  createdAt: Date;
  mascota: MascotaAdopcionDto;

  static fromEntity(
    publicacion: PublicacionAdopcion,
  ): PublicacionAdopcionResponseDto {
    const mascota = publicacion.mascota;
    return {
      idPublicacion: publicacion.idPublicacion,
      estado: publicacion.estado,
      descripcion: publicacion.descripcion,
      createdAt: publicacion.createdAt,
      mascota: {
        idMascota: mascota.idMascota,
        nombre: mascota.nombre,
        especie: mascota.especie,
        raza: mascota.raza,
        sexo: mascota.sexo,
        fechaNacimiento: mascota.fechaNacimiento,
        foto: mascota.foto,
      },
    };
  }
}
