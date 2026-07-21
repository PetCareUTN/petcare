import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { CreateMascotaDto } from './dto/create-mascota.dto';
import { MascotaResponseDto } from './dto/mascota-response.dto';
import { UpdateMascotaDto } from './dto/update-mascota.dto';
import { Mascota } from './entities/mascota.entity';
import { UploadedImageFile } from './types/uploaded-image-file.type';

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
    foto?: UploadedImageFile,
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

    const fotoPath = foto ? await this.saveFoto(foto) : null;

    const mascota = this.mascotasRepository.create({
      nombre: dto.nombre,
      idHistoria: null,
      especie: dto.especie,
      raza: dto.raza ?? null,
      sexo: dto.sexo,
      fechaNacimiento: dto.fechaNacimiento ?? null,
      peso: dto.peso === undefined ? null : dto.peso.toFixed(2),
      esterilizado: dto.esterilizado ?? false,
      foto: fotoPath,
      observaciones: dto.observaciones ?? null,
      usuarios: [duenio],
    });

    const savedMascota = await this.mascotasRepository.save(mascota);
    return MascotaResponseDto.fromEntity(savedMascota);
  }

  private async saveFoto(foto: UploadedImageFile): Promise<string> {
    const uploadPath = join(process.cwd(), 'uploads', 'mascotas');
    await mkdir(uploadPath, { recursive: true });

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extension = extname(foto.originalname).toLowerCase();
    const filename = `mascota-${uniqueSuffix}${extension}`;
    await writeFile(join(uploadPath, filename), foto.buffer);

    return `/uploads/mascotas/${filename}`;
  }

  async findOne(id: number, userId: number): Promise<MascotaResponseDto> {
    const mascota = await this.findMascotaAndVerifyOwner(id, userId);
    return MascotaResponseDto.fromEntity(mascota);
  }

  async update(
    id: number,
    userId: number,
    dto: UpdateMascotaDto,
    foto?: UploadedImageFile,
  ): Promise<MascotaResponseDto> {
    const mascota = await this.findMascotaAndVerifyOwner(id, userId);

    if (dto.nombre !== undefined) {
      mascota.nombre = dto.nombre;
    }
    if (dto.especie !== undefined) {
      mascota.especie = dto.especie;
    }
    if (dto.raza !== undefined) {
      mascota.raza = dto.raza;
    }
    if (dto.sexo !== undefined) {
      mascota.sexo = dto.sexo;
    }
    if (dto.fechaNacimiento !== undefined) {
      mascota.fechaNacimiento = dto.fechaNacimiento;
    }
    if (dto.peso !== undefined) {
      mascota.peso = dto.peso.toFixed(2);
    }
    if (dto.esterilizado !== undefined) {
      mascota.esterilizado = dto.esterilizado;
    }
    if (dto.observaciones !== undefined) {
      mascota.observaciones = dto.observaciones;
    }
    if (foto) {
      mascota.foto = await this.saveFoto(foto);
    }

    const savedMascota = await this.mascotasRepository.save(mascota);
    return MascotaResponseDto.fromEntity(savedMascota);
  }

  private async findMascotaAndVerifyOwner(
    id: number,
    userId: number,
  ): Promise<Mascota> {
    const mascota = await this.mascotasRepository.findOne({
      where: { idMascota: id },
      relations: ['usuarios'],
    });

    if (!mascota) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'Mascota no encontrada',
      });
    }

    const esDuenio = mascota.usuarios.some((user) => user.idUsuario === userId);
    if (!esDuenio) {
      throw new ForbiddenException({
        codigoEstado: 403,
        mensaje: 'No tiene permisos para acceder a este recurso',
      });
    }

    return mascota;
  }
}
