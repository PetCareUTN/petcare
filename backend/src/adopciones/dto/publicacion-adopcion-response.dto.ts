import { TamanoMascota } from '../../common/enums/tamano-mascota.enum';
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
  edadAnios: number | null;
  esterilizado: boolean;
  foto: string | null;
}

export class PublicacionAdopcionResponseDto {
  idPublicacion: number;
  estado: string;
  descripcion: string;
  tamano: TamanoMascota | null;
  vacunado: boolean;
  compatiblePerros: boolean;
  compatibleGatos: boolean;
  compatibleNinos: boolean;
  necesitaPatio: boolean;
  ubicacion: string | null;
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
      tamano: publicacion.tamano,
      vacunado: publicacion.vacunado,
      compatiblePerros: publicacion.compatiblePerros,
      compatibleGatos: publicacion.compatibleGatos,
      compatibleNinos: publicacion.compatibleNinos,
      necesitaPatio: publicacion.necesitaPatio,
      ubicacion: publicacion.ubicacion,
      createdAt: publicacion.createdAt,
      mascota: {
        idMascota: mascota.idMascota,
        nombre: mascota.nombre,
        especie: mascota.especie,
        raza: mascota.raza,
        sexo: mascota.sexo,
        fechaNacimiento: mascota.fechaNacimiento,
        edadAnios: calcularEdadAnios(mascota.fechaNacimiento),
        esterilizado: mascota.esterilizado,
        foto: mascota.foto,
      },
    };
  }
}

function calcularEdadAnios(fechaNacimiento: string | null): number | null {
  if (!fechaNacimiento) {
    return null;
  }
  const nacimiento = new Date(fechaNacimiento);
  if (Number.isNaN(nacimiento.getTime())) {
    return null;
  }

  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const aunNoCumplio =
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() &&
      hoy.getDate() < nacimiento.getDate());
  if (aunNoCumplio) {
    edad -= 1;
  }
  return Math.max(edad, 0);
}
