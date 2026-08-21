import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppointmentStatus } from '../common/enums/appointment-status.enum';
import { ValidationStatus } from '../common/enums/validation-status.enum';
import { Veterinario } from '../veterinarios/entities/veterinario.entity';
import { RechazarTurnoVeterinarioDto } from './dto/rechazar-turno-veterinario.dto';
import { TurnoVeterinarioResponseDto } from './dto/turno-veterinario-response.dto';
import { TurnoVeterinario } from './entities/turno-veterinario.entity';

@Injectable()
export class TurnosVeterinariosService {
  constructor(
    @InjectRepository(TurnoVeterinario)
    private readonly turnosRepository: Repository<TurnoVeterinario>,
    @InjectRepository(Veterinario)
    private readonly veterinariosRepository: Repository<Veterinario>,
  ) {}

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
