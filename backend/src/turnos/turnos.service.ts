import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { DiaSemana } from '../common/enums/dia-semana.enum';
import { TurnoEstado } from '../common/enums/turno-estado.enum';
import { ValidationStatus } from '../common/enums/validation-status.enum';
import { DisponibilidadVeterinaria } from '../disponibilidades-veterinarias/entities/disponibilidad-veterinaria.entity';
import { Mascota } from '../mascotas/entities/mascota.entity';
import { Veterinario } from '../veterinarios/entities/veterinario.entity';
import { CreateTurnoDto } from './dto/create-turno.dto';
import { TurnoResponseDto } from './dto/turno-response.dto';
import { Turno } from './entities/turno.entity';

const DIAS_POR_INDICE: DiaSemana[] = [
  DiaSemana.DOMINGO,
  DiaSemana.LUNES,
  DiaSemana.MARTES,
  DiaSemana.MIERCOLES,
  DiaSemana.JUEVES,
  DiaSemana.VIERNES,
  DiaSemana.SABADO,
];

const ESTADOS_QUE_OCUPAN_HORARIO = [TurnoEstado.PENDIENTE, TurnoEstado.CONFIRMADO];

@Injectable()
export class TurnosService {
  constructor(
    @InjectRepository(Turno)
    private readonly turnosRepository: Repository<Turno>,
    @InjectRepository(Mascota)
    private readonly mascotasRepository: Repository<Mascota>,
    @InjectRepository(Veterinario)
    private readonly veterinariosRepository: Repository<Veterinario>,
    @InjectRepository(DisponibilidadVeterinaria)
    private readonly disponibilidadesRepository: Repository<DisponibilidadVeterinaria>,
  ) {}

  async solicitar(idDueno: number, dto: CreateTurnoDto): Promise<TurnoResponseDto> {
    if (dto.horaInicio >= dto.horaFin) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje: 'La hora de inicio debe ser anterior a la hora de fin',
      });
    }

    const mascota = await this.mascotasRepository.findOne({
      where: { idMascota: dto.idMascota },
      relations: ['usuarios'],
    });

    if (!mascota) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'Mascota no encontrada',
      });
    }

    const esDuenio = mascota.usuarios.some((usuario) => usuario.idUsuario === idDueno);
    if (!esDuenio) {
      throw new ForbiddenException({
        codigoEstado: 403,
        mensaje: 'La mascota no pertenece al usuario autenticado',
      });
    }

    const veterinario = await this.veterinariosRepository.findOne({
      where: { idVeterinario: dto.idVeterinario },
    });

    if (!veterinario || veterinario.estadoValidacion !== ValidationStatus.APROBADO) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'Veterinaria no encontrada',
      });
    }

    await this.verificarDisponibilidad(veterinario.idVeterinario, dto);
    await this.verificarSinSolapamiento(veterinario.idVeterinario, dto);

    const turno = this.turnosRepository.create({
      veterinario,
      mascota,
      dueno: { idUsuario: idDueno },
      fecha: dto.fecha,
      horaInicio: dto.horaInicio,
      horaFin: dto.horaFin,
      estado: TurnoEstado.PENDIENTE,
    });

    const turnoGuardado = await this.turnosRepository.save(turno);
    turnoGuardado.veterinario = veterinario;
    turnoGuardado.mascota = mascota;

    return TurnoResponseDto.fromEntity(turnoGuardado);
  }

  private async verificarDisponibilidad(
    idVeterinario: number,
    dto: CreateTurnoDto,
  ): Promise<void> {
    const diaSemana = this.obtenerDiaSemana(dto.fecha);

    const disponibilidades = await this.disponibilidadesRepository.find({
      where: { veterinario: { idVeterinario }, diaSemana },
    });

    const horarioDisponible = disponibilidades.some(
      (disponibilidad) =>
        dto.horaInicio >= disponibilidad.horaInicio &&
        dto.horaFin <= disponibilidad.horaFin,
    );

    if (!horarioDisponible) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje: 'El horario solicitado no está disponible para esta veterinaria',
      });
    }
  }

  private async verificarSinSolapamiento(
    idVeterinario: number,
    dto: CreateTurnoDto,
  ): Promise<void> {
    const turnosDelDia = await this.turnosRepository.find({
      where: {
        veterinario: { idVeterinario },
        fecha: dto.fecha,
        estado: In(ESTADOS_QUE_OCUPAN_HORARIO),
      },
    });

    const seSolapa = turnosDelDia.some(
      (turno) => dto.horaInicio < turno.horaFin && dto.horaFin > turno.horaInicio,
    );

    if (seSolapa) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje: 'El horario solicitado ya está ocupado',
      });
    }
  }

  private obtenerDiaSemana(fecha: string): DiaSemana {
    const [anio, mes, dia] = fecha.split('-').map(Number);
    const fechaUtc = new Date(Date.UTC(anio, mes - 1, dia));
    return DIAS_POR_INDICE[fechaUtc.getUTCDay()];
  }
}
