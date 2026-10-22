import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { AppointmentStatus } from '../common/enums/appointment-status.enum';
import { DiaSemana } from '../common/enums/dia-semana.enum';
import { TipoDisponibilidad } from '../common/enums/tipo-disponibilidad.enum';
import { ValidationStatus } from '../common/enums/validation-status.enum';
import { DisponibilidadVeterinaria } from '../disponibilidades-veterinarias/entities/disponibilidad-veterinaria.entity';
import { Mascota } from '../mascotas/entities/mascota.entity';
import {
  DatosTurno,
  NotificacionesTurnosService,
} from '../notificaciones/notificaciones-turnos.service';
import { SobreturnosVeterinariosService } from '../sobreturnos-veterinarios/sobreturnos-veterinarios.service';
import { User } from '../users/entities/user.entity';
import { Veterinario } from '../veterinarios/entities/veterinario.entity';
import { AgendarTurnoVeterinarioDto } from './dto/agendar-turno-veterinario.dto';
import { CancelarTurnoVeterinarioDto } from './dto/cancelar-turno-veterinario.dto';
import { CapacidadHorarioResponseDto } from './dto/capacidad-horario-response.dto';
import { CreateTurnoVeterinarioDto } from './dto/create-turno-veterinario.dto';
import { RegistrarAsistenciaDto } from './dto/registrar-asistencia.dto';
import { TurnoDuenioResponseDto } from './dto/turno-duenio-response.dto';
import { TurnoVeterinarioResponseDto } from './dto/turno-veterinario-response.dto';
import { TurnoVeterinario } from './entities/turno-veterinario.entity';

const DURACION_TURNO_MINUTOS = 30;
/** Tope de días que se pueden pedir de una vez para armar la agenda. */
const MAX_DIAS_AGENDA = 62;
/**
 * Estados en los que el turno sigue ocupando su lugar en la agenda.
 *
 * Incluye los terminales a propósito: lo que libera el horario es cancelar,
 * no que el turno ya haya ocurrido. Si ASISTIO o AUSENTE quedaran afuera, un
 * turno ya cerrado liberaría su cupo y otra persona podría reservar encima
 * (P1-193).
 */
const ESTADOS_QUE_OCUPAN_HORARIO = [
  AppointmentStatus.CONFIRMADO,
  AppointmentStatus.ASISTIO,
  AppointmentStatus.AUSENTE,
];
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
    private readonly sobreturnosVeterinariosService: SobreturnosVeterinariosService,
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
    const cuposPorTurno = await this.cuposDelHorario(
      dto.idVeterinario,
      dto.fecha,
      dto.hora,
      horaFin,
    );

    if (cuposPorTurno === 0) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje:
          'El horario solicitado no está disponible para esa veterinaria',
      });
    }

    // El dueño nunca puede pasarse del cupo: se chequea y se guarda bajo el
    // mismo bloqueo para que dos reservas simultáneas no ocupen el último lugar.
    const guardado = await this.conAgendaBloqueada(
      dto.idVeterinario,
      dto.fecha,
      async () => {
        await this.verificarCupoDisponible(
          dto.idVeterinario,
          dto.fecha,
          dto.hora,
          horaFin,
          cuposPorTurno,
        );

        const turno = this.turnosRepository.create({
          veterinario,
          mascota,
          duenio: { idUsuario: idDueno } as User,
          fecha: dto.fecha,
          hora: dto.hora,
          motivoConsulta: dto.motivoConsulta ?? null,
          estado: AppointmentStatus.CONFIRMADO,
          creadoPor: 'dueño',
          sobrecupo: false,
        });
        return this.turnosRepository.save(turno);
      },
    );
    const turnoCompleto = await this.turnosRepository.findOne({
      where: { idTurno: guardado.idTurno },
      relations: ['veterinario', 'mascota', 'mascota.usuarios', 'duenio'],
    });

    await this.notificacionesTurnosService.notificarTurnoConfirmado(
      this.aDatosTurno(turnoCompleto!),
    );

    return TurnoVeterinarioResponseDto.fromEntity(turnoCompleto!);
  }

  /**
   * Cupos que tiene un horario para esa fecha: la suma de las franjas
   * semanales (atención y sobreturno) que lo contienen entero, más los
   * sobreturnos de fecha puntual cargados para esa hora.
   */
  private async cuposDelHorario(
    idVeterinario: number,
    fecha: string,
    horaInicio: string,
    horaFin: string,
  ): Promise<number> {
    const diaSemana = this.obtenerDiaSemana(fecha);
    const disponibilidades = await this.disponibilidadesRepository.find({
      where: { veterinario: { idVeterinario }, diaSemana },
    });

    const inicioMinutos = this.aMinutos(horaInicio);
    const finMinutos = this.aMinutos(horaFin);
    const deFranjas = disponibilidades
      .filter(
        (disponibilidad) =>
          inicioMinutos >= this.aMinutos(disponibilidad.horaInicio) &&
          finMinutos <= this.aMinutos(disponibilidad.horaFin),
      )
      .reduce(
        (total, disponibilidad) => total + disponibilidad.cuposPorTurno,
        0,
      );

    const cuposExtra =
      await this.sobreturnosVeterinariosService.obtenerCuposExtraPorHora(
        idVeterinario,
        fecha,
      );

    return deFranjas + (cuposExtra.get(horaInicio) ?? 0);
  }

  /** Turnos que ocupan su lugar y se solapan con el horario pedido. */
  private async contarOcupados(
    idVeterinario: number,
    fecha: string,
    horaInicio: string,
    horaFin: string,
  ): Promise<number> {
    const turnosDelDia = await this.turnosRepository.find({
      where: { veterinario: { idVeterinario }, fecha },
    });

    const inicioMinutos = this.aMinutos(horaInicio);
    const finMinutos = this.aMinutos(horaFin);
    return turnosDelDia.filter((turno) => {
      if (!ESTADOS_QUE_OCUPAN_HORARIO.includes(turno.estado)) {
        return false;
      }
      const inicioTurnoExistente = this.aMinutos(turno.hora);
      const finTurnoExistente = inicioTurnoExistente + DURACION_TURNO_MINUTOS;
      return (
        inicioMinutos < finTurnoExistente && finMinutos > inicioTurnoExistente
      );
    }).length;
  }

  /**
   * Rechaza la reserva si ya se alcanzó la cantidad de cupos configurada para
   * esa franja (ej. dos veterinarios de la misma veterinaria atendiendo a la
   * misma hora).
   */
  private async verificarCupoDisponible(
    idVeterinario: number,
    fecha: string,
    horaInicio: string,
    horaFin: string,
    cuposPorTurno: number,
  ): Promise<void> {
    const ocupados = await this.contarOcupados(
      idVeterinario,
      fecha,
      horaInicio,
      horaFin,
    );

    if (ocupados >= cuposPorTurno) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje: 'Ese horario ya no tiene cupos disponibles',
      });
    }
  }

  /**
   * Serializa las reservas de una veterinaria en una fecha con un bloqueo de
   * Postgres que dura hasta que termina `accion`. Sin esto, dos reservas
   * simultáneas pueden leer el mismo cupo libre y ocuparlo las dos.
   */
  private conAgendaBloqueada<T>(
    idVeterinario: number,
    fecha: string,
    accion: () => Promise<T>,
  ): Promise<T> {
    return this.turnosRepository.manager.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock($1, hashtext($2))', [
        idVeterinario,
        fecha,
      ]);
      return accion();
    });
  }

  /**
   * Carga de un turno por parte de la veterinaria (web). Usa los mismos
   * horarios y cupos que la reserva del dueño, pero el veterinario puede
   * agendar aunque el horario esté lleno: en ese caso la primera llamada
   * responde 409 `CUPO_LLENO` y, si confirma, se repite con `forzar: true` y
   * el turno queda marcado como sobrecupo. Fuera de su atención y de sus
   * sobreturnos no se puede agendar.
   */
  async agendarComoVeterinario(
    idUsuario: number,
    dto: AgendarTurnoVeterinarioDto,
  ): Promise<TurnoVeterinarioResponseDto> {
    const veterinario = await this.findVeterinarioValidado(idUsuario);

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

    if (new Date(`${dto.fecha}T${dto.hora}`).getTime() <= Date.now()) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje: 'No se puede agendar un turno en un horario que ya pasó',
      });
    }

    const horaFin = this.sumarMinutos(dto.hora, DURACION_TURNO_MINUTOS);
    const cupos = await this.cuposDelHorario(
      veterinario.idVeterinario,
      dto.fecha,
      dto.hora,
      horaFin,
    );
    if (cupos === 0) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje:
          'Ese horario está fuera de tu horario de atención y de tus sobreturnos. Configuralo en Disponibilidad.',
      });
    }

    const guardado = await this.conAgendaBloqueada(
      veterinario.idVeterinario,
      dto.fecha,
      async () => {
        const ocupados = await this.contarOcupados(
          veterinario.idVeterinario,
          dto.fecha,
          dto.hora,
          horaFin,
        );
        const lleno = ocupados >= cupos;

        if (lleno && !dto.forzar) {
          throw new ConflictException({
            codigoEstado: 409,
            codigo: 'CUPO_LLENO',
            mensaje:
              'Ese horario ya no tiene cupos disponibles. Podés agendar el turno igual.',
            cupos,
            ocupados,
          });
        }

        const turno = this.turnosRepository.create({
          veterinario,
          mascota,
          duenio,
          fecha: dto.fecha,
          hora: dto.hora,
          motivoConsulta: dto.motivoConsulta ?? null,
          estado: AppointmentStatus.CONFIRMADO,
          creadoPor: 'veterinario',
          sobrecupo: lleno,
        });
        return this.turnosRepository.save(turno);
      },
    );

    const turnoCompleto = await this.turnosRepository.findOne({
      where: { idTurno: guardado.idTurno },
      relations: ['veterinario', 'mascota', 'mascota.usuarios', 'duenio'],
    });

    await this.notificacionesTurnosService.notificarTurnoConfirmado(
      this.aDatosTurno(turnoCompleto!),
    );

    return TurnoVeterinarioResponseDto.fromEntity(turnoCompleto!);
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

    const principal = duenios.find(
      (usuario) => usuario.idUsuario === mascota.idDuenioPrincipal,
    );
    const elegido = principal ?? duenios[0];
    if (!elegido) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje: 'La mascota no tiene un dueño asociado',
      });
    }
    return elegido;
  }

  /**
   * Capacidad y ocupación de la agenda de la veterinaria en un rango de
   * fechas, franja por franja, para que la web muestre los huecos libres.
   * Solo devuelve las franjas que tienen cupos o turnos.
   */
  async capacidadAgenda(
    idUsuario: number,
    desde: string,
    hasta: string,
  ): Promise<CapacidadHorarioResponseDto[]> {
    const veterinario = await this.findVeterinarioValidado(idUsuario);
    const { idVeterinario } = veterinario;

    const fechas = this.fechasEntre(desde, hasta);
    if (fechas.length === 0 || fechas.length > MAX_DIAS_AGENDA) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje: `El rango de fechas debe tener entre 1 y ${MAX_DIAS_AGENDA} días`,
      });
    }

    const [disponibilidades, extrasPorFecha, turnos] = await Promise.all([
      this.disponibilidadesRepository.find({
        where: { veterinario: { idVeterinario } },
      }),
      this.sobreturnosVeterinariosService.obtenerCuposExtraPorRango(
        idVeterinario,
        desde,
        hasta,
      ),
      this.turnosRepository.find({
        where: { veterinario: { idVeterinario }, fecha: Between(desde, hasta) },
      }),
    ]);

    const resultado: CapacidadHorarioResponseDto[] = [];
    for (const fecha of fechas) {
      const diaSemana = this.obtenerDiaSemana(fecha);
      const franjas = new Map<
        string,
        { atencion: number; sobreturno: number; ocupados: number }
      >();
      const franja = (hora: string) => {
        const existente = franjas.get(hora);
        if (existente) {
          return existente;
        }
        const nueva = { atencion: 0, sobreturno: 0, ocupados: 0 };
        franjas.set(hora, nueva);
        return nueva;
      };

      for (const disponibilidad of disponibilidades) {
        if (disponibilidad.diaSemana !== diaSemana) {
          continue;
        }
        const fin = this.aMinutos(disponibilidad.horaFin);
        for (
          let minuto = this.aMinutos(disponibilidad.horaInicio);
          minuto + DURACION_TURNO_MINUTOS <= fin;
          minuto += DURACION_TURNO_MINUTOS
        ) {
          const destino = franja(this.deMinutos(minuto));
          if (disponibilidad.tipo === TipoDisponibilidad.SOBRETURNO) {
            destino.sobreturno += disponibilidad.cuposPorTurno;
          } else {
            destino.atencion += disponibilidad.cuposPorTurno;
          }
        }
      }

      for (const [hora, cupos] of extrasPorFecha.get(fecha) ?? []) {
        franja(hora).sobreturno += cupos;
      }

      for (const turno of turnos) {
        if (
          turno.fecha === fecha &&
          ESTADOS_QUE_OCUPAN_HORARIO.includes(turno.estado)
        ) {
          franja(this.deMinutos(this.aMinutos(turno.hora))).ocupados += 1;
        }
      }

      for (const hora of [...franjas.keys()].sort()) {
        const { atencion, sobreturno, ocupados } = franjas.get(hora)!;
        resultado.push({
          fecha,
          hora,
          cuposAtencion: atencion,
          cuposSobreturno: sobreturno,
          ocupados,
        });
      }
    }

    return resultado;
  }

  /** Fechas (YYYY-MM-DD) de `desde` a `hasta`, ambas incluidas. */
  private fechasEntre(desde: string, hasta: string): string[] {
    const [a1, m1, d1] = desde.split('-').map(Number);
    const [a2, m2, d2] = hasta.split('-').map(Number);
    const inicio = Date.UTC(a1, m1 - 1, d1);
    const fin = Date.UTC(a2, m2 - 1, d2);
    const fechas: string[] = [];
    for (let dia = inicio; dia <= fin; dia += 24 * 60 * 60 * 1000) {
      fechas.push(new Date(dia).toISOString().slice(0, 10));
      if (fechas.length > MAX_DIAS_AGENDA) {
        break;
      }
    }
    return fechas;
  }

  /**
   * Horarios de inicio (HH:MM) todavía con cupo para ese veterinario en esa
   * fecha: los que caen dentro de alguna franja configurada y todavía no
   * alcanzaron la cantidad de turnos simultáneos permitida en esa franja
   * (cuposPorTurno). Una vez ocupados todos los cupos de un horario, deja de
   * aparecer para el resto de los dueños.
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

    const ocupadosPorHora = new Map<string, number>();
    for (const turno of turnosDelDia) {
      if (!ESTADOS_QUE_OCUPAN_HORARIO.includes(turno.estado)) {
        continue;
      }
      const hora = this.deMinutos(this.aMinutos(turno.hora));
      ocupadosPorHora.set(hora, (ocupadosPorHora.get(hora) ?? 0) + 1);
    }

    const capacidadPorHora = new Map<string, number>();
    for (const disponibilidad of disponibilidades) {
      const inicio = this.aMinutos(disponibilidad.horaInicio);
      const fin = this.aMinutos(disponibilidad.horaFin);
      for (
        let minuto = inicio;
        minuto + DURACION_TURNO_MINUTOS <= fin;
        minuto += DURACION_TURNO_MINUTOS
      ) {
        const hora = this.deMinutos(minuto);
        capacidadPorHora.set(
          hora,
          (capacidadPorHora.get(hora) ?? 0) + disponibilidad.cuposPorTurno,
        );
      }
    }

    const cuposExtra =
      await this.sobreturnosVeterinariosService.obtenerCuposExtraPorHora(
        idVeterinario,
        fecha,
      );
    for (const [hora, cupoExtra] of cuposExtra) {
      capacidadPorHora.set(hora, (capacidadPorHora.get(hora) ?? 0) + cupoExtra);
    }

    const slots = new Set<string>();
    for (const [hora, capacidad] of capacidadPorHora) {
      const ocupados = ocupadosPorHora.get(hora) ?? 0;
      if (ocupados < capacidad) {
        slots.add(hora);
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
   * Turnos veterinarios del dueño autenticado: los que solicitó y los de las
   * mascotas que comparte con otros dueños, opcionalmente filtrados por estado.
   */
  async findMisTurnos(
    idUsuario: number,
    estado?: AppointmentStatus,
  ): Promise<TurnoDuenioResponseDto[]> {
    const filtroEstado = estado ? { estado } : {};
    const turnos = await this.turnosRepository.find({
      where: [
        { duenio: { idUsuario }, ...filtroEstado },
        { mascota: { usuarios: { idUsuario } }, ...filtroEstado },
      ],
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
      relations: [
        'veterinario',
        'veterinario.usuario',
        'mascota',
        'mascota.usuarios',
        'duenio',
      ],
    });

    if (!turno) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'Turno veterinario no encontrado',
      });
    }

    // Cualquiera de los dueños de la mascota puede cancelar el turno, no solo
    // el que lo reservó.
    const esDuenio =
      turno.duenio.idUsuario === idUsuario ||
      (turno.mascota.usuarios ?? []).some((u) => u.idUsuario === idUsuario);
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
      idUsuario,
    );

    return TurnoVeterinarioResponseDto.fromEntity(guardado);
  }

  /**
   * Cierra el turno indicando si el cliente se presentó o no (P1-193).
   *
   * Solo lo puede hacer el veterinario del turno: la asistencia la constata
   * quien atiende, no quien reservó.
   */
  async registrarAsistencia(
    idUsuario: number,
    idTurno: number,
    dto: RegistrarAsistenciaDto,
  ): Promise<TurnoVeterinarioResponseDto> {
    const turno = await this.buscarTurnoDelVeterinario(idUsuario, idTurno);

    if (turno.estado !== AppointmentStatus.CONFIRMADO) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje: 'Solo se puede registrar la asistencia de turnos confirmados',
      });
    }

    // Marcar antes de que el turno empiece no significa nada: el cliente
    // todavía está a tiempo de llegar.
    if (!this.yaEmpezo(turno)) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje:
          'Todavía no se puede registrar la asistencia: el turno no empezó',
      });
    }

    turno.estado = dto.asistio
      ? AppointmentStatus.ASISTIO
      : AppointmentStatus.AUSENTE;

    const guardado = await this.turnosRepository.save(turno);

    return TurnoVeterinarioResponseDto.fromEntity(guardado);
  }

  /**
   * Vuelve el turno a CONFIRMADO para corregir una marca equivocada.
   *
   * Solo el mismo día del turno: equivocarse de fila en la agenda es fácil y
   * tiene que poder corregirse, pero reabrir turnos viejos distorsionaría las
   * métricas de ausentismo mucho después de los hechos.
   */
  async revertirAsistencia(
    idUsuario: number,
    idTurno: number,
  ): Promise<TurnoVeterinarioResponseDto> {
    const turno = await this.buscarTurnoDelVeterinario(idUsuario, idTurno);

    const terminales: AppointmentStatus[] = [
      AppointmentStatus.ASISTIO,
      AppointmentStatus.AUSENTE,
    ];
    if (!terminales.includes(turno.estado)) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje: 'Este turno no tiene una asistencia registrada',
      });
    }

    if (turno.fecha !== this.hoy()) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje: 'La asistencia solo se puede corregir el mismo día del turno',
      });
    }

    turno.estado = AppointmentStatus.CONFIRMADO;

    const guardado = await this.turnosRepository.save(turno);

    return TurnoVeterinarioResponseDto.fromEntity(guardado);
  }

  /** Turno existente que pertenece al veterinario de esta sesión. */
  private async buscarTurnoDelVeterinario(
    idUsuario: number,
    idTurno: number,
  ): Promise<TurnoVeterinario> {
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

    if (turno.veterinario.usuario.idUsuario !== idUsuario) {
      throw new ForbiddenException({
        codigoEstado: 403,
        mensaje: 'No tiene permisos para registrar la asistencia de este turno',
      });
    }

    return turno;
  }

  /** `true` si ya pasó la hora de inicio del turno. */
  private yaEmpezo(turno: TurnoVeterinario): boolean {
    // `fecha` y `hora` se guardan sin zona horaria y representan la hora local
    // de la veterinaria: se arma la fecha en local y no con toISOString, que
    // correría el día al pasar a UTC.
    const inicio = new Date(`${turno.fecha}T${turno.hora}`);
    return inicio.getTime() <= Date.now();
  }

  /** Fecha de hoy en formato YYYY-MM-DD, en hora local. */
  private hoy(): string {
    const ahora = new Date();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    return `${ahora.getFullYear()}-${mes}-${dia}`;
  }

  /** Datos del turno que necesitan las notificaciones de la US-22. */
  private aDatosTurno(turno: TurnoVeterinario): DatosTurno {
    return {
      idTurno: turno.idTurno,
      tipoTurno: 'turno_veterinario',
      idDuenio: turno.duenio.idUsuario,
      idPrestador: turno.veterinario.usuario.idUsuario,
      nombreDuenio: this.nombreCompleto(turno.duenio),
      duenios: (turno.mascota.usuarios ?? []).map((u) => ({
        idUsuario: u.idUsuario,
        nombre: this.nombreCompleto(u),
      })),
      nombrePrestador: this.nombreCompleto(turno.veterinario.usuario),
      nombreMascota: turno.mascota.nombre,
      fecha: turno.fecha,
      hora: turno.hora,
      servicio: 'consulta veterinaria',
      creadoPor: turno.creadoPor ?? 'dueño',
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
