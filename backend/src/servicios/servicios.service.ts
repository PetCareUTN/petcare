import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoriaServicio } from '../common/enums/categoria-servicio.enum';
import { User } from '../users/entities/user.entity';
import { CreateServicioDto } from './dto/create-servicio.dto';
import { DisponibilidadDto } from './dto/disponibilidad.dto';
import { ServicioResponseDto } from './dto/servicio-response.dto';
import { UpdateServicioDto } from './dto/update-servicio.dto';
import { DisponibilidadServicio } from './entities/disponibilidad-servicio.entity';
import { Servicio } from './entities/servicio.entity';

@Injectable()
export class ServiciosService {
  constructor(
    @InjectRepository(Servicio)
    private readonly serviciosRepository: Repository<Servicio>,
    @InjectRepository(DisponibilidadServicio)
    private readonly disponibilidadesRepository: Repository<DisponibilidadServicio>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(
    idUsuario: number,
    dto: CreateServicioDto,
  ): Promise<ServicioResponseDto> {
    const usuario = await this.usersRepository.findOne({
      where: { idUsuario },
    });
    if (!usuario) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'Usuario no encontrado',
      });
    }

    this.validarDisponibilidades(dto.disponibilidades);

    const servicio = this.serviciosRepository.create({
      usuario,
      categoria: dto.categoria,
      descripcion: dto.descripcion ?? null,
      disponibilidades: dto.disponibilidades.map((d) =>
        this.buildDisponibilidad(d),
      ),
    });

    const savedServicio = await this.serviciosRepository.save(servicio);
    return ServicioResponseDto.fromEntity(savedServicio);
  }

  async findMine(idUsuario: number): Promise<ServicioResponseDto[]> {
    const servicios = await this.serviciosRepository.find({
      where: { usuario: { idUsuario } },
      relations: ['usuario'],
      order: { idServicio: 'ASC' },
    });

    return servicios.map((servicio) => ServicioResponseDto.fromEntity(servicio));
  }

  async findAll(
    categoria?: CategoriaServicio,
  ): Promise<ServicioResponseDto[]> {
    const servicios = await this.serviciosRepository.find({
      where: categoria ? { categoria } : {},
      relations: ['usuario'],
      order: { idServicio: 'ASC' },
    });

    return servicios.map((servicio) => ServicioResponseDto.fromEntity(servicio));
  }

  async findOne(id: number): Promise<ServicioResponseDto> {
    const servicio = await this.findServicio(id);
    return ServicioResponseDto.fromEntity(servicio);
  }

  async update(
    id: number,
    idUsuario: number,
    dto: UpdateServicioDto,
  ): Promise<ServicioResponseDto> {
    const servicio = await this.findServicioYVerificarPropietario(
      id,
      idUsuario,
    );

    if (dto.categoria !== undefined) {
      servicio.categoria = dto.categoria;
    }
    if (dto.descripcion !== undefined) {
      servicio.descripcion = dto.descripcion;
    }
    if (dto.disponibilidades !== undefined) {
      this.validarDisponibilidades(dto.disponibilidades);
      await this.disponibilidadesRepository.delete({
        servicio: { idServicio: servicio.idServicio },
      });
      servicio.disponibilidades = dto.disponibilidades.map((d) =>
        this.buildDisponibilidad(d),
      );
    }

    const savedServicio = await this.serviciosRepository.save(servicio);
    return ServicioResponseDto.fromEntity(savedServicio);
  }

  async remove(id: number, idUsuario: number): Promise<void> {
    const servicio = await this.findServicioYVerificarPropietario(
      id,
      idUsuario,
    );

    await this.serviciosRepository.remove(servicio);
  }

  private buildDisponibilidad(
    dto: DisponibilidadDto,
  ): DisponibilidadServicio {
    const disponibilidad = new DisponibilidadServicio();
    disponibilidad.diaSemana = dto.diaSemana;
    disponibilidad.horaInicio = dto.horaInicio;
    disponibilidad.horaFin = dto.horaFin;
    return disponibilidad;
  }

  private validarDisponibilidades(
    disponibilidades: DisponibilidadDto[],
  ): void {
    const hayFranjaInvalida = disponibilidades.some(
      (d) => d.horaInicio >= d.horaFin,
    );

    if (hayFranjaInvalida) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje: 'La hora de inicio debe ser anterior a la hora de fin',
      });
    }
  }

  private async findServicioYVerificarPropietario(
    id: number,
    idUsuario: number,
  ): Promise<Servicio> {
    const servicio = await this.findServicio(id);

    if (servicio.usuario.idUsuario !== idUsuario) {
      throw new ForbiddenException({
        codigoEstado: 403,
        mensaje: 'No tiene permisos para acceder a este recurso',
      });
    }

    return servicio;
  }

  private async findServicio(id: number): Promise<Servicio> {
    const servicio = await this.serviciosRepository.findOne({
      where: { idServicio: id },
      relations: ['usuario'],
    });

    if (!servicio) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'Servicio no encontrado',
      });
    }

    return servicio;
  }
}
