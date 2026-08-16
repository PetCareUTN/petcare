import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { Raw, Repository } from 'typeorm';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleName } from '../common/enums/role-name.enum';
import { ValidationStatus } from '../common/enums/validation-status.enum';
import { EventoClinico } from '../eventos-clinicos/entities/evento-clinico.entity';
import { UserPublicDto } from '../users/dto/user-public.dto';
import { User } from '../users/entities/user.entity';
import { Veterinario } from '../veterinarios/entities/veterinario.entity';
import { CreateMascotaDto } from './dto/create-mascota.dto';
import { MascotaResponseDto } from './dto/mascota-response.dto';
import { UpdateMascotaDto } from './dto/update-mascota.dto';
import { Mascota } from './entities/mascota.entity';
import { UploadedImageFile } from './types/uploaded-image-file.type';

type VetAttentionContext = {
  ownerDocument?: string;
  ownerEmail?: string;
};

@Injectable()
export class MascotasService {
  constructor(
    @InjectRepository(Mascota)
    private readonly mascotasRepository: Repository<Mascota>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Veterinario)
    private readonly veterinariosRepository: Repository<Veterinario>,
    @InjectRepository(EventoClinico)
    private readonly eventosClinicosRepository: Repository<EventoClinico>,
  ) {}

  async create(
    duenioId: number,
    dto: CreateMascotaDto,
    foto?: UploadedImageFile,
  ): Promise<MascotaResponseDto> {
    const duenio = await this.findUserById(duenioId);
    if (!duenio) {
      throw new UnauthorizedException({
        codigoEstado: 401,
        mensaje: 'No autorizado',
      });
    }

    return this.createForOwner(duenio, dto, foto);
  }

  async findOwner(email?: string, documento?: string): Promise<UserPublicDto> {
    const normalizedDocument = documento?.trim();
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail && !normalizedDocument) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje: 'El DNI o email del dueño es obligatorio',
      });
    }

    const duenio = normalizedDocument
      ? await this.usersRepository.findOne({
          where: { numeroDocumento: normalizedDocument },
        })
      : await this.usersRepository.findOne({
          where: {
            email: Raw((alias) => `LOWER(${alias}) = :email`, {
              email: normalizedEmail,
            }),
          },
        });

    this.ensureExistingOwner(duenio);
    return UserPublicDto.fromEntity(duenio);
  }

  findOwnerByEmail(email?: string): Promise<UserPublicDto> {
    return this.findOwner(email);
  }

  async createForExistingOwner(
    duenioId: number,
    dto: CreateMascotaDto,
    foto?: UploadedImageFile,
  ): Promise<MascotaResponseDto> {
    const duenio = await this.findUserById(duenioId);
    this.ensureExistingOwner(duenio);

    return this.createForOwner(duenio, dto, foto);
  }

  private findUserById(idUsuario: number): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { idUsuario },
    });
  }

  private ensureExistingOwner(user: User | null): asserts user is User {
    if (!user) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'Dueño no encontrado',
      });
    }

    if (user.rol.nombre !== RoleName.DUENO_MASCOTA) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje: 'El usuario indicado no es dueño de mascota',
      });
    }
  }

  private async createForOwner(
    duenio: User,
    dto: CreateMascotaDto,
    foto?: UploadedImageFile,
  ): Promise<MascotaResponseDto> {
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
      alergias: dto.alergias ?? null,
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

  async findOne(
    id: number,
    requester: JwtPayload,
    attentionContext?: VetAttentionContext,
  ): Promise<MascotaResponseDto> {
    const mascota = await this.findMascotaForViewing(
      id,
      requester,
      attentionContext,
    );
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
    if (dto.alergias !== undefined) {
      mascota.alergias = dto.alergias;
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
    const mascota = await this.findMascota(id);

    const esDuenio = mascota.usuarios.some((user) => user.idUsuario === userId);
    if (!esDuenio) {
      throw new ForbiddenException({
        codigoEstado: 403,
        mensaje: 'No tiene permisos para acceder a este recurso',
      });
    }

    return mascota;
  }

  /**
   * A diferencia de la edición (solo el dueño), la consulta de datos básicos
   * también la puede hacer un veterinario validado que ya sea tratante de
   * la mascota (mismo criterio que la consulta de historia clínica).
   */
  private async findMascotaForViewing(
    id: number,
    requester: JwtPayload,
    attentionContext?: VetAttentionContext,
  ): Promise<Mascota> {
    const mascota = await this.findMascota(id);

    const esDuenio = mascota.usuarios.some(
      (user) => user.idUsuario === requester.sub,
    );
    if (esDuenio) {
      return mascota;
    }

    if (requester.rol === RoleName.VETERINARIO) {
      const veterinario = await this.veterinariosRepository.findOne({
        where: { usuario: { idUsuario: requester.sub } },
      });

      if (
        veterinario &&
        veterinario.estadoValidacion === ValidationStatus.APROBADO
      ) {
        if (this.perteneceAlDuenioBuscado(mascota, attentionContext)) {
          return mascota;
        }

        if (!mascota.idHistoria) {
          throw new ForbiddenException({
            codigoEstado: 403,
            mensaje: 'No tiene permisos para acceder a este recurso',
          });
        }

        const evento = await this.eventosClinicosRepository.findOne({
          where: {
            historia: { idHistoria: mascota.idHistoria },
            veterinario: { idVeterinario: veterinario.idVeterinario },
          },
        });

        if (evento) {
          return mascota;
        }
      }
    }

    throw new ForbiddenException({
      codigoEstado: 403,
      mensaje: 'No tiene permisos para acceder a este recurso',
    });
  }

  private perteneceAlDuenioBuscado(
    mascota: Mascota,
    attentionContext?: VetAttentionContext,
  ): boolean {
    const ownerDocument = attentionContext?.ownerDocument?.trim();
    const ownerEmail = attentionContext?.ownerEmail?.trim().toLowerCase();

    if (!ownerDocument && !ownerEmail) {
      return false;
    }

    return mascota.usuarios.some((user) => {
      if (ownerDocument && user.numeroDocumento === ownerDocument) {
        return true;
      }

      return ownerEmail ? user.email.toLowerCase() === ownerEmail : false;
    });
  }

  private async findMascota(id: number): Promise<Mascota> {
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

    return mascota;
  }

  async findAllByUser(userId: number): Promise<MascotaResponseDto[]> {
    const mascotas = await this.mascotasRepository
      .createQueryBuilder('mascota')
      .innerJoin('mascota.usuarios', 'owner', 'owner.idUsuario = :userId', {
        userId,
      })
      .leftJoinAndSelect('mascota.usuarios', 'usuarios')
      .orderBy('mascota.idMascota', 'ASC')
      .getMany();

    return mascotas.map((mascota) => MascotaResponseDto.fromEntity(mascota));
  }

  async findAllByOwnerId(ownerId: number): Promise<MascotaResponseDto[]> {
    const duenio = await this.findUserById(ownerId);
    this.ensureExistingOwner(duenio);
    return this.findAllByUser(ownerId);
  }
}
