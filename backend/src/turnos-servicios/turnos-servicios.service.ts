import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoriaServicio } from '../common/enums/categoria-servicio.enum';
import { DiaSemana } from '../common/enums/dia-semana.enum';
import { TurnoServicioEstado } from '../common/enums/turno-servicio-estado.enum';
import { Mascota } from '../mascotas/entities/mascota.entity';
import { Servicio } from '../servicios/entities/servicio.entity';
import { User } from '../users/entities/user.entity';
import { CancelarTurnoServicioDto } from './dto/cancelar-turno-servicio.dto';
import { CreateTurnoServicioDto } from './dto/create-turno-servicio.dto';
import { TurnoServicioDuenioResponseDto } from './dto/turno-servicio-duenio-response.dto';
import { TurnoServicioPrestadorResponseDto } from './dto/turno-servicio-prestador-response.dto';
import { TurnoServicio } from './entities/turno-servicio.entity';

const DURACION_MINUTOS_POR_CATEGORIA: Record<CategoriaServicio, number> = {
  [CategoriaServicio.PASEADOR]: 30,
  [CategoriaServicio.PELUQUERIA]: 30,
  [CategoriaServicio.GUARDERIA]: 60,
};

const DIAS_POR_INDICE: DiaSemana[] = [
  DiaSemana.DOMINGO,
  DiaSemana.LUNES,
  DiaSemana.MARTES,
  DiaSemana.MIERCOLES,
  DiaSemana.JUEVES,
  DiaSemana.VIERNES,
  DiaSemana.SABADO,
];

@Injectable()
export class TurnosServiciosService {
  constructor(
    @InjectRepository(TurnoServicio)
    private readonly turnosRepository: Repository<TurnoServicio>,
    @InjectRepository(Servicio)
    private readonly serviciosRepository: Repository<Servicio>,
    @InjectRepository(Mascota)
    private readonly mascotasRepository: Repository<Mascota>,
  ) {}

  async solicitar(
    idDueno: number,
    dto: CreateTurnoServicioDto,
  ): Promise<TurnoServicioPrestadorResponseDto> {
    const mascota = await this.mascotasRepository.findOne({
      where: { idMascota: dto.idMascota },
      relations: ['usuarios'],
    });

    if (!mascota) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'No se encontró la mascota',
      });
    }

    if (!mascota.usuarios.some((usuario) => usuario.idUsuario === idDueno)) {
      throw new ForbiddenException({
        codigoEstado: 403,
        mensaje: 'La mascota no pertenece al dueño autenticado',
      });
    }

    const servicio = await this.serviciosRepository.findOne({
      where: { idServicio: dto.idServicio },
      relations: ['usuario', 'disponibilidades'],
    });

    if (!servicio) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'No se encontró el servicio',
      });
    }

    const duracionMinutos = DURACION_MINUTOS_POR_CATEGORIA[servicio.categoria];
    const horaFin = this.sumarMinutos(dto.horaInicio, duracionMinutos);

    this.verificarDisponibilidad(servicio, dto.fecha, dto.horaInicio, horaFin);
    await this.verificarSinSolapamiento(
      servicio.usuario.idUsuario,
      dto.fecha,
      dto.horaInicio,
      horaFin,
    );

    const turno = this.turnosRepository.create({
      servicio,
      mascota,
      duenio: { idUsuario: idDueno } as User,
      fecha: dto.fecha,
      horaInicio: dto.horaInicio,
      horaFin,
      notas: dto.notas ?? null,
      estado: TurnoServicioEstado.CONFIRMADO,
    });

    const guardado = await this.turnosRepository.save(turno);
    const turnoCompleto = await this.turnosRepository.findOne({
      where: { idTurno: guardado.idTurno },
      relations: ['servicio', 'servicio.usuario', 'mascota', 'duenio'],
    });

    return TurnoServicioPrestadorResponseDto.fromEntity(turnoCompleto!);
  }

  private verificarDisponibilidad(
    servicio: Servicio,
    fecha: string,
    horaInicio: string,
    horaFin: string,
  ): void {
    const diaSemana = this.obtenerDiaSemana(fecha);
    const disponible = (servicio.disponibilidades ?? []).some(
      (disponibilidad) =>
        disponibilidad.diaSemana === diaSemana &&
        horaInicio >= disponibilidad.horaInicio &&
        horaFin <= disponibilidad.horaFin,
    );

    if (!disponible) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje: 'El horario solicitado no está disponible para ese servicio',
      });
    }
  }

  private async verificarSinSolapamiento(
    idPrestador: number,
    fecha: string,
    horaInicio: string,
    horaFin: string,
  ): Promise<void> {
    const turnosDelDia = await this.turnosRepository.find({
      where: {
        servicio: { usuario: { idUsuario: idPrestador } },
        fecha,
        estado: TurnoServicioEstado.CONFIRMADO,
      },
    });

    const ocupado = turnosDelDia.some(
      (turno) => horaInicio < turno.horaFin && horaFin > turno.horaInicio,
    );

    if (ocupado) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje: 'Ese horario ya está ocupado',
      });
    }
  }

  private obtenerDiaSemana(fecha: string): DiaSemana {
    const [anio, mes, dia] = fecha.split('-').map(Number);
    return DIAS_POR_INDICE[new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay()];
  }

  private sumarMinutos(hora: string, minutos: number): string {
    const [horas, mins] = hora.split(':').map(Number);
    const totalMinutos = horas * 60 + mins + minutos;
    const horaResultado = Math.floor(totalMinutos / 60) % 24;
    const minResultado = totalMinutos % 60;
    return `${String(horaResultado).padStart(2, '0')}:${String(minResultado).padStart(2, '0')}`;
  }

  async findMisReservas(
    idUsuario: number,
    estado?: TurnoServicioEstado,
  ): Promise<TurnoServicioDuenioResponseDto[]> {
    const turnos = await this.turnosRepository.find({
      where: {
        duenio: { idUsuario },
        ...(estado ? { estado } : {}),
      },
      relations: ['servicio', 'servicio.usuario', 'mascota', 'duenio'],
      order: { fecha: 'ASC', horaInicio: 'ASC', idTurno: 'ASC' },
    });

    return turnos.map((turno) => TurnoServicioDuenioResponseDto.fromEntity(turno));
  }

  async findRecibidas(
    idUsuario: number,
    estado?: TurnoServicioEstado,
  ): Promise<TurnoServicioPrestadorResponseDto[]> {
    const turnos = await this.turnosRepository.find({
      where: {
        servicio: { usuario: { idUsuario } },
        ...(estado ? { estado } : {}),
      },
      relations: ['servicio', 'servicio.usuario', 'mascota', 'duenio'],
      order: { fecha: 'ASC', horaInicio: 'ASC', idTurno: 'ASC' },
    });

    return turnos.map((turno) => TurnoServicioPrestadorResponseDto.fromEntity(turno));
  }

  async cancelar(
    idUsuario: number,
    idTurno: number,
    dto: CancelarTurnoServicioDto,
  ): Promise<TurnoServicioPrestadorResponseDto | TurnoServicioDuenioResponseDto> {
    const turno = await this.turnosRepository.findOne({
      where: { idTurno },
      relations: ['servicio', 'servicio.usuario', 'mascota', 'duenio'],
    });

    if (!turno) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'Turno de servicio no encontrado',
      });
    }

    const esDuenio = turno.duenio.idUsuario === idUsuario;
    const esPrestador = turno.servicio.usuario.idUsuario === idUsuario;

    if (!esDuenio && !esPrestador) {
      throw new ForbiddenException({
        codigoEstado: 403,
        mensaje: 'No tiene permisos para cancelar este turno',
      });
    }

    if (turno.estado !== TurnoServicioEstado.CONFIRMADO) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje: 'Solo se pueden cancelar turnos confirmados',
      });
    }

    turno.estado = TurnoServicioEstado.CANCELADO;
    turno.motivoCancelacion = dto.motivoCancelacion?.trim() || null;
    turno.canceladoPor = esDuenio ? 'dueño' : 'prestador';

    const guardado = await this.turnosRepository.save(turno);

    return esDuenio
      ? TurnoServicioDuenioResponseDto.fromEntity(guardado)
      : TurnoServicioPrestadorResponseDto.fromEntity(guardado);
  }
}
