import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppointmentStatus } from '../common/enums/appointment-status.enum';
import { DiaSemana } from '../common/enums/dia-semana.enum';
import { ValidationStatus } from '../common/enums/validation-status.enum';
import { DisponibilidadVeterinaria } from '../disponibilidades-veterinarias/entities/disponibilidad-veterinaria.entity';
import { Mascota } from '../mascotas/entities/mascota.entity';
import {
  DatosTurno,
  NotificacionesTurnosService,
} from '../notificaciones/notificaciones-turnos.service';
import { User } from '../users/entities/user.entity';
import { Veterinario } from '../veterinarios/entities/veterinario.entity';
import { CancelarTurnoVeterinarioDto } from './dto/cancelar-turno-veterinario.dto';
import { CreateTurnoVeterinarioDto } from './dto/create-turno-veterinario.dto';
import { TurnoDuenioResponseDto } from './dto/turno-duenio-response.dto';
import { TurnoVeterinarioResponseDto } from './dto/turno-veterinario-response.dto';
import { TurnoVeterinario } from './entities/turno-veterinario.entity';

const DURACION_TURNO_MINUTOS = 30;
const ESTADOS_QUE_OCUPAN_HORARIO = [AppointmentStatus.CONFIRMADO];
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
export class TurnosVeterinariosService {
  constructor(
    @InjectRepository(TurnoVeterinario)
    private readonly turnosRepository: Repository<TurnoVeterinario>,
    @InjectRepository(Veterinario)
    private readonly veterinariosRepository: Repository<Veterinario>,
    @InjectRepository(Mascota)
    private readonly mascotasRepository: Repository<Mascota>,
    @InjectRepository(DisponibilidadVeterinaria)
    private readonly disponibilidadesRepository: Repository<DisponibilidadVeterinaria>,
    private readonly notificacionesTurnosService: NotificacionesTurnosService,
  ) {}

  async solicitar(
    idDueno: number,
    dto: CreateTurnoVeterinarioDto,
  ): Promise<TurnoVeterinarioResponseDto> {
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

    const veterinario = await this.veterinariosRepository.findOne({
      where: { idVeterinario: dto.idVeterinario },
    });

    if (
      !veterinario ||
      veterinario.estadoValidacion !== ValidationStatus.APROBADO
    ) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'No se encontró la veterinaria',
      });
    }

    const horaFin = this.sumarMinutos(dto.hora, DURACION_TURNO_MINUTOS);
    await this.verificarDisponibilidad(dto.idVeterinario, dto.fecha, dto.hora, horaFin);
    await this.verificarSinSolapamiento(dto.idVeterinario, dto.fecha, dto.hora, horaFin);

    const turno = this.turnosRepository.create({
      veterinario,
      mascota,
      duenio: { idUsuario: idDueno } as User,
      fecha: dto.fecha,
      hora: dto.hora,
      motivoConsulta: dto.motivoConsulta ?? null,
      estado: AppointmentStatus.CONFIRMADO,
    });

    const guardado = await this.turnosRepository.save(turno);
    const turnoCompleto = await this.turnosRepository.findOne({
      where: { idTurno: guardado.idTurno },
      relations: ['veterinario', 'mascota', 'duenio'],
    });

    await this.notificacionesTurnosService.notificarTurnoConfirmado(
      this.aDatosTurno(turnoCompleto!),
    );

    return TurnoVeterinarioResponseDto.fromEntity(turnoCompleto!);
  }

  private async verificarDisponibilidad(
    idVeterinario: number,
    fecha: string,
    horaInicio: string,
    horaFin: string,
  ): Promise<void> {
    const diaSemana = this.obtenerDiaSemana(fecha);
    const disponibilidades = await this.disponibilidadesRepository.find({
      where: { veterinario: { idVeterinario }, diaSemana },
    });

    const inicioMinutos = this.aMinutos(horaInicio);
    const finMinutos = this.aMinutos(horaFin);
    const disponible = disponibilidades.some(
      (disponibilidad) =>
        inicioMinutos >= this.aMinutos(disponibilidad.horaInicio) &&
        finMinutos <= this.aMinutos(disponibilidad.horaFin),
    );

    if (!disponible) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje: 'El horario solicitado no está disponible para esa veterinaria',
      });
    }
  }

  private async verificarSinSolapamiento(
    idVeterinario: number,
    fecha: string,
    horaInicio: string,
    horaFin: string,
  ): Promise<void> {
    const turnosDelDia = await this.turnosRepository.find({
      where: { veterinario: { idVeterinario }, fecha },
    });

    const inicioMinutos = this.aMinutos(horaInicio);
    const finMinutos = this.aMinutos(horaFin);
    const ocupado = turnosDelDia.some((turno) => {
      if (!ESTADOS_QUE_OCUPAN_HORARIO.includes(turno.estado)) {
        return false;
      }
      const inicioTurnoExistente = this.aMinutos(turno.hora);
      const finTurnoExistente = inicioTurnoExistente + DURACION_TURNO_MINUTOS;
      return inicioMinutos < finTurnoExistente && finMinutos > inicioTurnoExistente;
    });

    if (ocupado) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje: 'Ese horario ya está ocupado',
      });
    }
  }

  /**
   * Horarios de inicio (HH:MM) todavía libres para ese veterinario en esa
   * fecha: los que caen dentro de alguna franja configurada y no se solapan
   * con un turno ya confirmado. Una vez asignado un turno, ese horario deja
   * de aparecer para el resto de los dueños.
   */
  async horariosDisponibles(
    idVeterinario: number,
    fecha: string,
  ): Promise<string[]> {
    const diaSemana = this.obtenerDiaSemana(fecha);
    const disponibilidades = await this.disponibilidadesRepository.find({
      where: { veterinario: { idVeterinario }, diaSemana },
    });

    const turnosDelDia = await this.turnosRepository.find({
      where: { veterinario: { idVeterinario }, fecha },
    });

    const ocupados = turnosDelDia
      .filter((turno) => ESTADOS_QUE_OCUPAN_HORARIO.includes(turno.estado))
      .map((turno) => this.deMinutos(this.aMinutos(turno.hora)));

    const slots = new Set<string>();
    for (const disponibilidad of disponibilidades) {
      const inicio = this.aMinutos(disponibilidad.horaInicio);
      const fin = this.aMinutos(disponibilidad.horaFin);
      for (
        let minuto = inicio;
        minuto + DURACION_TURNO_MINUTOS <= fin;
        minuto += DURACION_TURNO_MINUTOS
      ) {
        const hora = this.deMinutos(minuto);
        if (!ocupados.includes(hora)) {
          slots.add(hora);
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

  async findMine(
    idUsuario: number,
    estado?: AppointmentStatus,
  ): Promise<TurnoVeterinarioResponseDto[]> {
    const veterinario = await this.findVeterinarioValidado(idUsuario);
    const turnos = await this.turnosRepository.find({
      where: {
        veterinario: { idVeterinario: veterinario.idVeterinario },
        ...(estado ? { estado } : {}),
      },
      relations: ['veterinario', 'mascota', 'duenio'],
      order: { fecha: 'ASC', hora: 'ASC', idTurno: 'ASC' },
    });

    return turnos.map((turno) => TurnoVeterinarioResponseDto.fromEntity(turno));
  }

  /**
   * Turnos veterinarios del dueño autenticado. Solo devuelve los turnos que
   * el propio usuario solicitó, opcionalmente filtrados por estado.
   */
  async findMisTurnos(
    idUsuario: number,
    estado?: AppointmentStatus,
  ): Promise<TurnoDuenioResponseDto[]> {
    const turnos = await this.turnosRepository.find({
      where: {
        duenio: { idUsuario },
        ...(estado ? { estado } : {}),
      },
      relations: ['veterinario', 'veterinario.usuario', 'mascota', 'duenio'],
      order: { fecha: 'ASC', hora: 'ASC', idTurno: 'ASC' },
    });

    return turnos.map((turno) => TurnoDuenioResponseDto.fromEntity(turno));
  }

  async cancelar(
    idUsuario: number,
    idTurno: number,
    dto: CancelarTurnoVeterinarioDto,
  ): Promise<TurnoVeterinarioResponseDto> {
    const turno = await this.turnosRepository.findOne({
      where: { idTurno },
      relations: ['veterinario', 'veterinario.usuario', 'mascota', 'duenio'],
    });

    if (!turno) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'Turno veterinario no encontrado',
      });
    }

    const esDuenio = turno.duenio.idUsuario === idUsuario;
    const esVeterinario = turno.veterinario.usuario.idUsuario === idUsuario;

    if (!esDuenio && !esVeterinario) {
      throw new ForbiddenException({
        codigoEstado: 403,
        mensaje: 'No tiene permisos para cancelar este turno',
      });
    }

    if (turno.estado !== AppointmentStatus.CONFIRMADO) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje: 'Solo se pueden cancelar turnos confirmados',
      });
    }

    turno.estado = AppointmentStatus.CANCELADO;
    turno.motivoCancelacion = dto.motivoCancelacion?.trim() || null;
    turno.canceladoPor = esDuenio ? 'dueño' : 'veterinario';

    const guardado = await this.turnosRepository.save(turno);

    await this.notificacionesTurnosService.notificarTurnoCancelado(
      this.aDatosTurno(guardado),
      esDuenio ? 'duenio' : 'prestador',
      guardado.motivoCancelacion,
    );

    return TurnoVeterinarioResponseDto.fromEntity(guardado);
  }

  /** Datos del turno que necesitan las notificaciones de la US-22. */
  private aDatosTurno(turno: TurnoVeterinario): DatosTurno {
    return {
      idDuenio: turno.duenio.idUsuario,
      idPrestador: turno.veterinario.usuario.idUsuario,
      nombreDuenio: this.nombreCompleto(turno.duenio),
      nombrePrestador: this.nombreCompleto(turno.veterinario.usuario),
      nombreMascota: turno.mascota.nombre,
      fecha: turno.fecha,
      hora: turno.hora,
      servicio: 'consulta veterinaria',
    };
  }

  private nombreCompleto(usuario: User): string {
    return `${usuario.nombre} ${usuario.apellido ?? ''}`.trim();
  }

  private async findVeterinarioValidado(
    idUsuario: number,
  ): Promise<Veterinario> {
    const veterinario = await this.veterinariosRepository.findOne({
      where: { usuario: { idUsuario } },
    });

    if (
      !veterinario ||
      veterinario.estadoValidacion !== ValidationStatus.APROBADO
    ) {
      throw new ForbiddenException({
        codigoEstado: 403,
        mensaje: 'Su cuenta de veterinario no esta validada',
      });
    }

    return veterinario;
  }
}
