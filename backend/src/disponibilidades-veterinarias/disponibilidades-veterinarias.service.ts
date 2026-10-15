import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DiaSemana } from '../common/enums/dia-semana.enum';
import { ValidationStatus } from '../common/enums/validation-status.enum';
import { Veterinario } from '../veterinarios/entities/veterinario.entity';
import { DisponibilidadVeterinariaResponseDto } from './dto/disponibilidad-veterinaria-response.dto';
import { DisponibilidadVeterinariaDto } from './dto/disponibilidad-veterinaria.dto';
import { UpdateDisponibilidadVeterinariaDto } from './dto/update-disponibilidad-veterinaria.dto';
import { DisponibilidadVeterinaria } from './entities/disponibilidad-veterinaria.entity';

@Injectable()
export class DisponibilidadesVeterinariasService {
  constructor(
    @InjectRepository(DisponibilidadVeterinaria)
    private readonly disponibilidadesRepository: Repository<DisponibilidadVeterinaria>,
    @InjectRepository(Veterinario)
    private readonly veterinariosRepository: Repository<Veterinario>,
  ) {}

  async findMine(
    idUsuario: number,
  ): Promise<DisponibilidadVeterinariaResponseDto[]> {
    const veterinario = await this.findVeterinarioValidado(idUsuario);
    return this.findByVeterinario(veterinario.idVeterinario);
  }

  async replaceMine(
    idUsuario: number,
    dto: UpdateDisponibilidadVeterinariaDto,
  ): Promise<DisponibilidadVeterinariaResponseDto[]> {
    const veterinario = await this.findVeterinarioValidado(idUsuario);
    this.validarDisponibilidades(dto.disponibilidades);

    await this.disponibilidadesRepository.delete({
      veterinario: { idVeterinario: veterinario.idVeterinario },
    });

    const disponibilidades = dto.disponibilidades.map((disponibilidad) =>
      this.disponibilidadesRepository.create({
        veterinario,
        diaSemana: disponibilidad.diaSemana,
        horaInicio: disponibilidad.horaInicio,
        horaFin: disponibilidad.horaFin,
        cuposPorTurno: disponibilidad.cuposPorTurno ?? 1,
      }),
    );

    const savedDisponibilidades =
      await this.disponibilidadesRepository.save(disponibilidades);

    return this.sortDisponibilidades(savedDisponibilidades).map((d) =>
      DisponibilidadVeterinariaResponseDto.fromEntity(d),
    );
  }

  async findByVeterinario(
    idVeterinario: number,
  ): Promise<DisponibilidadVeterinariaResponseDto[]> {
    const veterinario = await this.veterinariosRepository.findOne({
      where: { idVeterinario },
    });

    if (
      !veterinario ||
      veterinario.estadoValidacion !== ValidationStatus.APROBADO
    ) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'Veterinaria no encontrada',
      });
    }

    const disponibilidades = await this.disponibilidadesRepository.find({
      where: { veterinario: { idVeterinario } },
      relations: ['veterinario'],
    });

    return this.sortDisponibilidades(disponibilidades).map((d) =>
      DisponibilidadVeterinariaResponseDto.fromEntity(d),
    );
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

  private validarDisponibilidades(
    disponibilidades: DisponibilidadVeterinariaDto[],
  ): void {
    const porDia = new Map<DiaSemana, DisponibilidadVeterinariaDto[]>();

    for (const disponibilidad of disponibilidades) {
      if (disponibilidad.horaInicio >= disponibilidad.horaFin) {
        throw new BadRequestException({
          codigoEstado: 400,
          mensaje: 'La hora de inicio debe ser anterior a la hora de fin',
        });
      }

      const disponibilidadesDelDia =
        porDia.get(disponibilidad.diaSemana) ?? [];
      disponibilidadesDelDia.push(disponibilidad);
      porDia.set(disponibilidad.diaSemana, disponibilidadesDelDia);
    }

    for (const disponibilidadesDelDia of porDia.values()) {
      const ordenadas = [...disponibilidadesDelDia].sort((a, b) =>
        a.horaInicio.localeCompare(b.horaInicio),
      );

      for (let i = 1; i < ordenadas.length; i += 1) {
        const anterior = ordenadas[i - 1];
        const actual = ordenadas[i];

        if (actual.horaInicio < anterior.horaFin) {
          throw new BadRequestException({
            codigoEstado: 400,
            mensaje: 'Las franjas horarias no pueden solaparse',
          });
        }
      }
    }
  }

  private sortDisponibilidades(
    disponibilidades: DisponibilidadVeterinaria[],
  ): DisponibilidadVeterinaria[] {
    const order = Object.values(DiaSemana);
    return [...disponibilidades].sort((a, b) => {
      const diaDiff = order.indexOf(a.diaSemana) - order.indexOf(b.diaSemana);
      return diaDiff !== 0
        ? diaDiff
        : a.horaInicio.localeCompare(b.horaInicio);
    });
  }
}
