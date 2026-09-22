import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ValidationStatus } from '../common/enums/validation-status.enum';
import { Veterinario } from '../veterinarios/entities/veterinario.entity';
import { CreateSobreturnoVeterinarioDto } from './dto/create-sobreturno-veterinario.dto';
import { SobreturnoVeterinarioResponseDto } from './dto/sobreturno-veterinario-response.dto';
import { SobreturnoVeterinario } from './entities/sobreturno-veterinario.entity';

@Injectable()
export class SobreturnosVeterinariosService {
  constructor(
    @InjectRepository(SobreturnoVeterinario)
    private readonly sobreturnosRepository: Repository<SobreturnoVeterinario>,
    @InjectRepository(Veterinario)
    private readonly veterinariosRepository: Repository<Veterinario>,
  ) {}

  async crear(
    idUsuario: number,
    dto: CreateSobreturnoVeterinarioDto,
  ): Promise<SobreturnoVeterinarioResponseDto> {
    const veterinario = await this.findVeterinarioValidado(idUsuario);

    if (dto.fecha < this.hoyIso()) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje: 'No se puede agregar un sobreturno en una fecha pasada',
      });
    }

    const existente = await this.sobreturnosRepository.findOne({
      where: {
        veterinario: { idVeterinario: veterinario.idVeterinario },
        fecha: dto.fecha,
        hora: dto.hora,
      },
    });
    if (existente) {
      throw new ConflictException({
        codigoEstado: 409,
        mensaje: 'Ya existe un sobreturno para esa fecha y hora. Eliminalo antes de cargar otro',
      });
    }

    const sobreturno = this.sobreturnosRepository.create({
      veterinario,
      fecha: dto.fecha,
      hora: dto.hora,
      cupos: dto.cupos ?? 1,
    });
    const guardado = await this.sobreturnosRepository.save(sobreturno);
    guardado.veterinario = veterinario;

    return SobreturnoVeterinarioResponseDto.fromEntity(guardado);
  }

  async listarMios(
    idUsuario: number,
    fecha?: string,
  ): Promise<SobreturnoVeterinarioResponseDto[]> {
    const veterinario = await this.findVeterinarioValidado(idUsuario);

    const sobreturnos = await this.sobreturnosRepository.find({
      where: {
        veterinario: { idVeterinario: veterinario.idVeterinario },
        ...(fecha ? { fecha } : {}),
      },
      relations: ['veterinario'],
      order: { fecha: 'ASC', hora: 'ASC' },
    });

    return sobreturnos.map((sobreturno) =>
      SobreturnoVeterinarioResponseDto.fromEntity(sobreturno),
    );
  }

  async eliminar(idUsuario: number, idSobreturno: number): Promise<void> {
    const veterinario = await this.findVeterinarioValidado(idUsuario);

    const sobreturno = await this.sobreturnosRepository.findOne({
      where: { idSobreturno },
      relations: ['veterinario'],
    });

    if (!sobreturno) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'Sobreturno no encontrado',
      });
    }

    if (sobreturno.veterinario.idVeterinario !== veterinario.idVeterinario) {
      throw new ForbiddenException({
        codigoEstado: 403,
        mensaje: 'No tiene permisos para eliminar este sobreturno',
      });
    }

    await this.sobreturnosRepository.remove(sobreturno);
  }

  /**
   * Cupos extra por hora que un veterinario agregó para una fecha, para
   * sumarlos a la capacidad de la disponibilidad habitual. Usado por
   * `turnos-veterinarios` al calcular horarios disponibles y al validar
   * una reserva.
   */
  async obtenerCuposExtraPorHora(
    idVeterinario: number,
    fecha: string,
  ): Promise<Map<string, number>> {
    const sobreturnos = await this.sobreturnosRepository.find({
      where: { veterinario: { idVeterinario }, fecha },
    });

    const cuposPorHora = new Map<string, number>();
    for (const sobreturno of sobreturnos) {
      const horaNormalizada = sobreturno.hora.slice(0, 5);
      cuposPorHora.set(
        horaNormalizada,
        (cuposPorHora.get(horaNormalizada) ?? 0) + sobreturno.cupos,
      );
    }

    return cuposPorHora;
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

  private hoyIso(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
