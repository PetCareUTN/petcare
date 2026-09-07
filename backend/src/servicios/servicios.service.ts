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
import {
  ServicioResponseDto,
  UbicacionServicio,
} from './dto/servicio-response.dto';
import { UpdateServicioDto } from './dto/update-servicio.dto';
import { DisponibilidadServicio } from './entities/disponibilidad-servicio.entity';
import { Servicio } from './entities/servicio.entity';
import { PrestadoresService } from '../prestadores/prestadores.service';
import { SolicitudPrestador } from '../prestadores/entities/solicitud-prestador.entity';
import { RoleName } from '../common/enums/role-name.enum';
import { ValidationStatus } from '../common/enums/validation-status.enum';
import { Veterinario } from '../veterinarios/entities/veterinario.entity';

@Injectable()
export class ServiciosService {
  constructor(
    @InjectRepository(Servicio)
    private readonly serviciosRepository: Repository<Servicio>,
    @InjectRepository(DisponibilidadServicio)
    private readonly disponibilidadesRepository: Repository<DisponibilidadServicio>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly prestadores: PrestadoresService,
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
    await this.prestadores.exigirAprobado(idUsuario, dto.categoria);

    const servicio = this.serviciosRepository.create({
      usuario,
      categoria: dto.categoria,
      descripcion: dto.descripcion ?? null,
      disponibilidades: dto.disponibilidades.map((d) =>
        this.buildDisponibilidad(d),
      ),
    });

    const savedServicio = await this.serviciosRepository.save(servicio);
    return this.toResponseDto(savedServicio);
  }

  async findMine(idUsuario: number): Promise<ServicioResponseDto[]> {
    const servicios = await this.serviciosRepository.find({
      where: { usuario: { idUsuario } },
      relations: ['usuario'],
      order: { idServicio: 'ASC' },
    });

    return Promise.all(
      servicios.map((servicio) => this.toResponseDto(servicio)),
    );
  }

  async findAll(
    categoria?: CategoriaServicio,
  ): Promise<ServicioResponseDto[]> {
    const query = this.serviciosRepository.createQueryBuilder('servicio')
      .innerJoinAndSelect('servicio.usuario', 'usuario')
      .innerJoinAndSelect('usuario.rol', 'rol')
      .leftJoinAndSelect('servicio.disponibilidades', 'disponibilidad')
      .leftJoin(SolicitudPrestador, 'solicitud', 'solicitud.id_usuario = usuario.id_usuario AND solicitud.categoria = servicio.categoria AND solicitud.estado = :estado', { estado: 'aprobado' })
      .leftJoin(Veterinario, 'veterinario', 'veterinario.id_usuario = usuario.id_usuario AND veterinario.estado_validacion = :validacionVeterinaria', { validacionVeterinaria: ValidationStatus.APROBADO })
      .where('usuario.estado = :activo AND ((rol.nombre = :dueno AND solicitud.id IS NOT NULL) OR (rol.nombre = :rolVeterinario AND veterinario.id_veterinario IS NOT NULL))', { activo: 'activo', dueno: RoleName.DUENO_MASCOTA, rolVeterinario: RoleName.VETERINARIO })
      .orderBy('servicio.idServicio', 'ASC');
    if (categoria) query.andWhere('servicio.categoria = :categoria', { categoria });
    const servicios = await query.getMany();

    return Promise.all(
      servicios.map((servicio) => this.toResponseDto(servicio)),
    );
  }

  async findOne(id: number, idUsuario?: number): Promise<ServicioResponseDto> {
    const servicio = await this.findServicio(id);
    if (idUsuario !== servicio.usuario.idUsuario) await this.prestadores.exigirAprobado(servicio.usuario.idUsuario, servicio.categoria);
    return this.toResponseDto(servicio);
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

    await this.prestadores.exigirAprobado(idUsuario, dto.categoria ?? servicio.categoria);
    if (dto.categoria !== undefined && dto.categoria !== servicio.categoria) {
      throw new BadRequestException({ codigoEstado: 400, mensaje: 'Creá un servicio nuevo para otra categoría; las reservas existentes conservan su categoría original.' });
    }

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
    return this.toResponseDto(savedServicio);
  }

  async remove(id: number, idUsuario: number): Promise<void> {
    const servicio = await this.findServicioYVerificarPropietario(
      id,
      idUsuario,
    );

    await this.serviciosRepository.remove(servicio);
  }

  /**
   * Arma el DTO de respuesta resolviendo la ubicación del prestador: los
   * veterinarios la tienen en su propia cuenta (usuarios.direccion), mientras
   * que los dueños de mascota que ofrecen servicios la tienen en la
   * solicitud de prestador aprobada para esa categoría (ver
   * PrestadoresService.obtenerUbicacion).
   */
  private async toResponseDto(servicio: Servicio): Promise<ServicioResponseDto> {
    const ubicacion = await this.resolverUbicacion(servicio);
    return ServicioResponseDto.fromEntity(servicio, ubicacion);
  }

  private async resolverUbicacion(
    servicio: Servicio,
  ): Promise<UbicacionServicio | null> {
    if (servicio.usuario.rol.nombre === RoleName.VETERINARIO) {
      return {
        direccion: servicio.usuario.direccion,
        latitud: servicio.usuario.latitud,
        longitud: servicio.usuario.longitud,
      };
    }

    return this.prestadores.obtenerUbicacion(
      servicio.usuario.idUsuario,
      servicio.categoria,
    );
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
