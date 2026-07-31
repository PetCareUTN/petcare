import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ValidationStatus } from '../common/enums/validation-status.enum';
import { HistoriaClinica } from '../historias-clinicas/entities/historia-clinica.entity';
import { Mascota } from '../mascotas/entities/mascota.entity';
import { Veterinario } from '../veterinarios/entities/veterinario.entity';
import { CreateEventoClinicoDto } from './dto/create-evento-clinico.dto';
import { EventoClinicoResponseDto } from './dto/evento-clinico-response.dto';
import { EventoClinico } from './entities/evento-clinico.entity';

@Injectable()
export class EventosClinicosService {
  constructor(
    @InjectRepository(EventoClinico)
    private readonly eventosClinicosRepository: Repository<EventoClinico>,
    @InjectRepository(HistoriaClinica)
    private readonly historiasClinicasRepository: Repository<HistoriaClinica>,
    @InjectRepository(Mascota)
    private readonly mascotasRepository: Repository<Mascota>,
    @InjectRepository(Veterinario)
    private readonly veterinariosRepository: Repository<Veterinario>,
  ) {}

  async create(
    idUsuario: number,
    dto: CreateEventoClinicoDto,
  ): Promise<EventoClinicoResponseDto> {
    const veterinario = await this.findVeterinarioValidado(idUsuario);
    const mascota = await this.findMascota(dto.idMascota);
    const historia = await this.findOrCreateHistoriaClinica(mascota);

    const evento = this.eventosClinicosRepository.create({
      historia,
      veterinario,
      tipo: dto.tipo,
      fecha: dto.fecha,
      descripcion: dto.descripcion,
      diagnostico: dto.diagnostico ?? null,
      tratamiento: dto.tratamiento ?? null,
      observaciones: dto.observaciones ?? null,
    });

    const savedEvento = await this.eventosClinicosRepository.save(evento);
    savedEvento.historia = {
      ...historia,
      mascota,
    };
    savedEvento.veterinario = veterinario;

    return EventoClinicoResponseDto.fromEntity(savedEvento);
  }

  private async findVeterinarioValidado(idUsuario: number): Promise<Veterinario> {
    const veterinario = await this.veterinariosRepository.findOne({
      where: { usuario: { idUsuario } },
    });

    if (!veterinario || veterinario.estadoValidacion !== ValidationStatus.APROBADO) {
      throw new ForbiddenException({
        codigoEstado: 403,
        mensaje: 'Su cuenta de veterinario no esta validada',
      });
    }

    return veterinario;
  }

  private async findMascota(idMascota: number): Promise<Mascota> {
    const mascota = await this.mascotasRepository.findOne({
      where: { idMascota },
      relations: ['historiaClinica'],
    });

    if (!mascota) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'Mascota no encontrada',
      });
    }

    return mascota;
  }

  private async findOrCreateHistoriaClinica(
    mascota: Mascota,
  ): Promise<HistoriaClinica> {
    if (mascota.historiaClinica) {
      return mascota.historiaClinica;
    }

    const historia = this.historiasClinicasRepository.create();
    const savedHistoria = await this.historiasClinicasRepository.save(historia);

    mascota.historiaClinica = savedHistoria;
    mascota.idHistoria = savedHistoria.idHistoria;
    await this.mascotasRepository.save(mascota);

    return savedHistoria;
  }
}
