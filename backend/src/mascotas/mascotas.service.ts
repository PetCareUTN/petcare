import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { CreateMascotaDto } from './dto/create-mascota.dto';
import { MascotaResponseDto } from './dto/mascota-response.dto';
import { Mascota } from './entities/mascota.entity';

@Injectable()
export class MascotasService {
  constructor(
    @InjectRepository(Mascota)
    private readonly mascotasRepository: Repository<Mascota>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(
    duenioId: number,
    dto: CreateMascotaDto,
  ): Promise<MascotaResponseDto> {
    const duenio = await this.usersRepository.findOne({
      where: { idUsuario: duenioId },
    });
    if (!duenio) {
      throw new UnauthorizedException({
        codigoEstado: 401,
        mensaje: 'No autorizado',
      });
    }

    const mascota = this.mascotasRepository.create({
      nombre: dto.nombre,
      idHistoria: null,
      especie: dto.especie,
      raza: dto.raza ?? null,
      sexo: dto.sexo,
      fechaNacimiento: dto.fechaNacimiento ?? null,
      peso: dto.peso === undefined ? null : dto.peso.toFixed(2),
      esterilizado: dto.esterilizado ?? false,
      foto: dto.foto ?? null,
      observaciones: dto.observaciones ?? null,
      usuarios: [duenio],
    });

    const savedMascota = await this.mascotasRepository.save(mascota);
    return MascotaResponseDto.fromEntity(savedMascota);
  }
}
