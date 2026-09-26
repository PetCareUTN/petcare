import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Mascota } from '../mascotas/entities/mascota.entity';
import { TagBleResponseDto } from './dto/tag-ble-response.dto';
import { VincularTagBleDto } from './dto/vincular-tag-ble.dto';
import { TagBle } from './entities/tag-ble.entity';

@Injectable()
export class TagsBleService {
  constructor(
    @InjectRepository(TagBle)
    private readonly tagsBleRepository: Repository<TagBle>,
    @InjectRepository(Mascota)
    private readonly mascotasRepository: Repository<Mascota>,
  ) {}

  async vincular(
    idUsuario: number,
    idMascota: number,
    dto: VincularTagBleDto,
  ): Promise<TagBleResponseDto> {
    const mascota = await this.findMascotaAndVerifyOwner(idMascota, idUsuario);

    const tagDeLaMascota = await this.tagsBleRepository.findOne({
      where: { mascota: { idMascota } },
    });
    if (tagDeLaMascota) {
      throw new ConflictException({
        codigoEstado: 409,
        mensaje: 'Esta mascota ya tiene un tag vinculado. Desvinculalo antes de asociar uno nuevo',
      });
    }

    const tagEnUso = await this.tagsBleRepository.findOne({
      where: { tagId: dto.tagId },
    });
    if (tagEnUso) {
      throw new ConflictException({
        codigoEstado: 409,
        mensaje: 'Ese tag ya está vinculado a otra mascota',
      });
    }

    const tagBle = this.tagsBleRepository.create({
      tagId: dto.tagId,
      mascota,
    });
    const guardado = await this.tagsBleRepository.save(tagBle);
    guardado.mascota = mascota;

    return TagBleResponseDto.fromEntity(guardado);
  }

  async desvincular(idUsuario: number, idMascota: number): Promise<void> {
    await this.findMascotaAndVerifyOwner(idMascota, idUsuario);

    const tagBle = await this.tagsBleRepository.findOne({
      where: { mascota: { idMascota } },
    });
    if (!tagBle) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'Esta mascota no tiene un tag vinculado',
      });
    }

    await this.tagsBleRepository.remove(tagBle);
  }

  async obtenerPorMascota(
    idUsuario: number,
    idMascota: number,
  ): Promise<TagBleResponseDto | null> {
    await this.findMascotaAndVerifyOwner(idMascota, idUsuario);

    const tagBle = await this.tagsBleRepository.findOne({
      where: { mascota: { idMascota } },
      relations: ['mascota'],
    });

    return tagBle ? TagBleResponseDto.fromEntity(tagBle) : null;
  }

  /**
   * Mascota del dueño a la que pertenece `tagId`.
   *
   * A diferencia del resto de los métodos, este entra por el tag y no por la
   * mascota: quien avisa una separación (US-34) solo conoce el tagId que venía
   * leyendo, porque es lo único que viaja en el frame Eddystone.
   *
   * Verifica igual que el tag sea de una mascota del usuario autenticado, así
   * nadie puede generar avisos sobre mascotas ajenas conociendo un tagId, que
   * viaja en claro y cualquiera con un scanner puede leer.
   */
  async buscarMascotaPorTag(idUsuario: number, tagId: string): Promise<Mascota> {
    const tagBle = await this.tagsBleRepository.findOne({
      where: { tagId },
      relations: ['mascota'],
    });

    if (!tagBle) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'No hay ninguna mascota con ese tag vinculado',
      });
    }

    return this.findMascotaAndVerifyOwner(tagBle.mascota.idMascota, idUsuario);
  }

  private async findMascotaAndVerifyOwner(
    idMascota: number,
    idUsuario: number,
  ): Promise<Mascota> {
    const mascota = await this.mascotasRepository.findOne({
      where: { idMascota },
      relations: ['usuarios'],
    });

    if (!mascota) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'Mascota no encontrada',
      });
    }

    const esDuenio = mascota.usuarios.some(
      (usuario) => usuario.idUsuario === idUsuario,
    );
    if (!esDuenio) {
      throw new ForbiddenException({
        codigoEstado: 403,
        mensaje: 'No tiene permisos para acceder a este recurso',
      });
    }

    return mascota;
  }
}
