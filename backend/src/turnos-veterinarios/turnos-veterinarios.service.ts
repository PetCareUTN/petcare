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
import { User } from '../users/entities/user.entity';
import { Veterinario } from '../veterinarios/entities/veterinario.entity';
import { CreateTurnoVeterinarioDto } from './dto/create-turno-veterinario.dto';
import { RechazarTurnoVeterinarioDto } from './dto/rechazar-turno-veterinario.dto';
import { TurnoVeterinarioResponseDto } from './dto/turno-veterinario-response.dto';
import { TurnoVeterinario } from './entities/turno-veterinario.entity';

const DURACION_TURNO_MINUTOS = 30;
const ESTADOS_QUE_OCUPAN_HORARIO = [
  AppointmentStatus.PENDIENTE,
  AppointmentStatus.CONFIRMADO,
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
      estado: AppointmentStatus.PENDIENTE,
    });

    const guardado = await this.turnosRepository.save(turno);
    const turnoCompleto = await this.turnosRepository.findOne({
      where: { idTurno: guardado.idTurno },
      relations: ['veterinario', 'mascota', 'duenio'],
    });

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

    const disponible = disponibilidades.some(
      (disponibilidad) =>
        horaInicio >= disponibilidad.horaInicio &&
        horaFin <= disponibilidad.horaFin,
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

    const ocupado = turnosDelDia.some((turno) => {
      if (!ESTADOS_QUE_OCUPAN_HORARIO.includes(turno.estado)) {
        return false;
      }
      const finTurnoExistente = this.sumarMinutos(
        turno.hora,
        DURACION_TURNO_MINUTOS,
      );
      return horaInicio < finTurnoExistente && horaFin > turno.hora;
    });

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

  async confirmar(
    idUsuario: number,
    idTurno: number,
  ): Promise<TurnoVeterinarioResponseDto> {
    const turno = await this.findTurnoPropioPendiente(idUsuario, idTurno);
    turno.estado = AppointmentStatus.CONFIRMADO;
    turno.motivoRechazo = null;
    return TurnoVeterinarioResponseDto.fromEntity(
      await this.turnosRepository.save(turno),
    );
  }

  async rechazar(
    idUsuario: number,
    idTurno: number,
    dto: RechazarTurnoVeterinarioDto,
  ): Promise<TurnoVeterinarioResponseDto> {
    const turno = await this.findTurnoPropioPendiente(idUsuario, idTurno);
    turno.estado = AppointmentStatus.RECHAZADO;
    turno.motivoRechazo = dto.motivoRechazo.trim();
    return TurnoVeterinarioResponseDto.fromEntity(
      await this.turnosRepository.save(turno),
    );
  }

  private async findTurnoPropioPendiente(
    idUsuario: number,
    idTurno: number,
  ): Promise<TurnoVeterinario> {
    const veterinario = await this.findVeterinarioValidado(idUsuario);
    const turno = await this.turnosRepository.findOne({
      where: { idTurno },
      relations: ['veterinario', 'mascota', 'duenio'],
    });

    if (!turno) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'Turno veterinario no encontrado',
      });
    }

    if (turno.veterinario.idVeterinario !== veterinario.idVeterinario) {
      throw new ForbiddenException({
        codigoEstado: 403,
        mensaje: 'No tiene permisos para gestionar este turno',
      });
    }

    if (turno.estado !== AppointmentStatus.PENDIENTE) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje: 'Solo se pueden gestionar turnos pendientes',
      });
    }

    return turno;
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
