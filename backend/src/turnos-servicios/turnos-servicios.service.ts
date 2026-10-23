import {
  BadRequestException,
  ConflictException,
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
import {
  DatosTurno,
  NotificacionesTurnosService,
} from '../notificaciones/notificaciones-turnos.service';
import { Servicio } from '../servicios/entities/servicio.entity';
import { User } from '../users/entities/user.entity';
import { AgendarTurnoServicioDto } from './dto/agendar-turno-servicio.dto';
import { CancelarTurnoServicioDto } from './dto/cancelar-turno-servicio.dto';
import { CreateTurnoServicioDto } from './dto/create-turno-servicio.dto';
import { TurnoServicioDuenioResponseDto } from './dto/turno-servicio-duenio-response.dto';
import { TurnoServicioPrestadorResponseDto } from './dto/turno-servicio-prestador-response.dto';
import { TurnoServicio } from './entities/turno-servicio.entity';
import { PrestadoresService } from '../prestadores/prestadores.service';

/** Texto legible de cada categoría para los mensajes de notificación. */
const NOMBRE_POR_CATEGORIA: Record<CategoriaServicio, string> = {
  [CategoriaServicio.PASEADOR]: 'paseo',
  [CategoriaServicio.PELUQUERIA]: 'peluquería',
  [CategoriaServicio.GUARDERIA]: 'guardería',
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
    private readonly notificacionesTurnosService: NotificacionesTurnosService,
    private readonly prestadores: PrestadoresService,
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

    await this.prestadores.exigirAprobado(servicio.usuario.idUsuario, servicio.categoria);
    if (servicio.usuario.idUsuario === idDueno) throw new BadRequestException('No podés reservar tu propio servicio.');

    return this.reservar(servicio, mascota, { idUsuario: idDueno } as User, dto, 'dueño');
  }

  /**
   * Reserva cargada por el prestador (web) para un cliente: mismas reglas de
   * horario que la reserva del dueño, pero sobre un servicio propio y con la
   * mascota que elija. El cliente recibe el aviso de que se le agendó el turno.
   */
  async agendarComoPrestador(
    idPrestador: number,
    dto: AgendarTurnoServicioDto,
  ): Promise<TurnoServicioPrestadorResponseDto> {
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

    if (servicio.usuario.idUsuario !== idPrestador) {
      throw new ForbiddenException({
        codigoEstado: 403,
        mensaje: 'Solo podés agendar turnos de tus propios servicios',
      });
    }

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

    const duenio = this.elegirDuenio(mascota, dto.idDuenio);

    await this.prestadores.exigirAprobado(idPrestador, servicio.categoria);

    return this.reservar(servicio, mascota, duenio, dto, 'veterinario');
  }

  /** Validaciones de horario y alta del turno, comunes a las dos formas de reservar. */
  private async reservar(
    servicio: Servicio,
    mascota: Mascota,
    duenio: User,
    dto: CreateTurnoServicioDto,
    creadoPor: 'dueño' | 'veterinario',
  ): Promise<TurnoServicioPrestadorResponseDto> {
    const inicio = new Date(`${dto.fecha}T${dto.horaInicio}:00-03:00`).getTime();
    if (!Number.isFinite(inicio) || inicio <= Date.now()) throw new BadRequestException('La reserva debe comenzar en el futuro.');
    const duracionMinutos = servicio.duracionMinutos;
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
      duenio: { idUsuario: duenio.idUsuario } as User,
      fecha: dto.fecha,
      horaInicio: dto.horaInicio,
      horaFin,
      notas: dto.notas ?? null,
      estado: TurnoServicioEstado.CONFIRMADO,
    });

    const guardado = await this.turnosRepository.save(turno);
    const turnoCompleto = await this.turnosRepository.findOne({
      where: { idTurno: guardado.idTurno },
      relations: [
        'servicio',
        'servicio.usuario',
        'mascota',
        'mascota.usuarios',
        'duenio',
      ],
    });

    await this.notificacionesTurnosService.notificarTurnoConfirmado({
      ...this.aDatosTurno(turnoCompleto!),
      creadoPor,
    });

    return TurnoServicioPrestadorResponseDto.fromEntity(turnoCompleto!);
  }

  /** Dueño al que se asocia el turno: el pedido, o el principal. */
  private elegirDuenio(mascota: Mascota, idDuenio?: number): User {
    const duenios = mascota.usuarios ?? [];

    if (idDuenio !== undefined) {
      const elegido = duenios.find((usuario) => usuario.idUsuario === idDuenio);
      if (!elegido) {
        throw new BadRequestException({
          codigoEstado: 400,
          mensaje: 'El cliente indicado no es dueño de la mascota',
        });
      }
      return elegido;
    }

    const elegido =
      duenios.find((usuario) => usuario.idUsuario === mascota.idDuenioPrincipal) ??
      duenios[0];
    if (!elegido) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje: 'La mascota no tiene un dueño asociado',
      });
    }
    return elegido;
  }

  private verificarDisponibilidad(
    servicio: Servicio,
    fecha: string,
    horaInicio: string,
    horaFin: string,
  ): void {
    const diaSemana = this.obtenerDiaSemana(fecha);
    // La base devuelve las horas con segundos ("10:30:00"): se comparan en
    // minutos, porque como texto "10:30" quedaría antes que "10:30:00".
    const inicio = this.aMinutos(horaInicio);
    const fin = this.aMinutos(horaFin);
    const disponible = (servicio.disponibilidades ?? []).some(
      (disponibilidad) =>
        disponibilidad.diaSemana === diaSemana &&
        inicio >= this.aMinutos(disponibilidad.horaInicio) &&
        fin <= this.aMinutos(disponibilidad.horaFin),
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

    // Las horas llegan con segundos ("10:30:00"): se comparan en minutos.
    const inicio = this.aMinutos(horaInicio);
    const fin = this.aMinutos(horaFin);
    const ocupado = turnosDelDia.some(
      (turno) =>
        inicio < this.aMinutos(turno.horaFin) &&
        fin > this.aMinutos(turno.horaInicio),
    );

    if (ocupado) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje: 'Ese horario ya está ocupado',
      });
    }
  }

  /**
   * Horarios de inicio (HH:MM) todavía libres para ese servicio en esa
   * fecha: los que caen dentro de alguna franja configurada y no se solapan
   * con un turno ya confirmado. Una vez asignado un turno, ese horario deja
   * de aparecer para el resto de los dueños.
   */
  async horariosDisponibles(idServicio: number, fecha: string): Promise<string[]> {
    const servicio = await this.serviciosRepository.findOne({
      where: { idServicio },
      relations: ['usuario', 'disponibilidades'],
    });

    if (!servicio) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'No se encontró el servicio',
      });
    }

    await this.prestadores.exigirAprobado(servicio.usuario.idUsuario, servicio.categoria);
    const duracionMinutos = servicio.duracionMinutos;
    const diaSemana = this.obtenerDiaSemana(fecha);

    const turnosDelDia = await this.turnosRepository.find({
      where: {
        servicio: { usuario: { idUsuario: servicio.usuario.idUsuario } },
        fecha,
        estado: TurnoServicioEstado.CONFIRMADO,
      },
    });
    const ocupados = turnosDelDia.map((turno) => ({
      inicio: this.aMinutos(turno.horaInicio),
      fin: this.aMinutos(turno.horaFin),
    }));

    const slots = new Set<string>();
    for (const disponibilidad of servicio.disponibilidades ?? []) {
      if (disponibilidad.diaSemana !== diaSemana) {
        continue;
      }
      const inicio = this.aMinutos(disponibilidad.horaInicio);
      const fin = this.aMinutos(disponibilidad.horaFin);
      for (
        let minuto = inicio;
        minuto + duracionMinutos <= fin;
        minuto += duracionMinutos
      ) {
        const solapado = ocupados.some(
          (turno) => minuto < turno.fin && minuto + duracionMinutos > turno.inicio,
        );
        if (!solapado) {
          slots.add(this.deMinutos(minuto));
        }
      }
    }

    return [...slots].sort();
  }

  private aMinutos(hora: string): number {
    const [horas, mins] = hora.split(':').map(Number);
    return horas * 60 + mins;
  }

  private deMinutos(minutos: number): string {
    return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
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
    // Las reservas de una mascota compartida las ven todos sus dueños, no solo
    // el que las hizo.
    const filtroEstado = estado ? { estado } : {};
    const turnos = await this.turnosRepository.find({
      where: [
        { duenio: { idUsuario }, ...filtroEstado },
        { mascota: { usuarios: { idUsuario } }, ...filtroEstado },
      ],
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
      relations: [
        'servicio',
        'servicio.usuario',
        'mascota',
        'mascota.usuarios',
        'duenio',
      ],
    });

    if (!turno) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'Turno de servicio no encontrado',
      });
    }

    // Cualquiera de los dueños de la mascota puede cancelar la reserva, no solo
    // el que la hizo.
    const esDuenio =
      turno.duenio.idUsuario === idUsuario ||
      (turno.mascota.usuarios ?? []).some((u) => u.idUsuario === idUsuario);
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

    // La confirmación de realización usa el mismo registro con bloqueo. Esta
    // actualización condicional evita cancelar una reserva recién completada.
    const cambio = await this.turnosRepository.update(
      { idTurno, estado: TurnoServicioEstado.CONFIRMADO },
      { estado: turno.estado, motivoCancelacion: turno.motivoCancelacion, canceladoPor: turno.canceladoPor },
    );
    if (cambio.affected !== 1) throw new ConflictException('La reserva cambió. Actualizá la lista antes de continuar.');
    const guardado = turno;

    await this.notificacionesTurnosService.notificarTurnoCancelado(
      this.aDatosTurno(guardado),
      esDuenio ? 'duenio' : 'prestador',
      guardado.motivoCancelacion,
      idUsuario,
    );

    return esDuenio
      ? TurnoServicioDuenioResponseDto.fromEntity(guardado)
      : TurnoServicioPrestadorResponseDto.fromEntity(guardado);
  }

  /** Datos del turno que necesitan las notificaciones de la US-22. */
  private aDatosTurno(turno: TurnoServicio): DatosTurno {
    return {
      idTurno: turno.idTurno,
      tipoTurno: 'turno_servicio',
      idDuenio: turno.duenio.idUsuario,
      idPrestador: turno.servicio.usuario.idUsuario,
      nombreDuenio: this.nombreCompleto(turno.duenio),
      duenios: (turno.mascota.usuarios ?? []).map((u) => ({
        idUsuario: u.idUsuario,
        nombre: this.nombreCompleto(u),
      })),
      nombrePrestador: this.nombreCompleto(turno.servicio.usuario),
      nombreMascota: turno.mascota.nombre,
      fecha: turno.fecha,
      hora: turno.horaInicio,
      servicio: NOMBRE_POR_CATEGORIA[turno.servicio.categoria],
    };
  }

  private nombreCompleto(usuario: User): string {
    return `${usuario.nombre} ${usuario.apellido ?? ''}`.trim();
  }
}
