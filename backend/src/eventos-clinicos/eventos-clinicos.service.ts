import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleName } from '../common/enums/role-name.enum';
import { ValidationStatus } from '../common/enums/validation-status.enum';
import { HistoriaClinica } from '../historias-clinicas/entities/historia-clinica.entity';
import { Mascota } from '../mascotas/entities/mascota.entity';
import { Veterinario } from '../veterinarios/entities/veterinario.entity';
import { CreateEventoClinicoDto } from './dto/create-evento-clinico.dto';
import { EventoClinicoResponseDto } from './dto/evento-clinico-response.dto';
import { HistoriaClinicaResponseDto } from './dto/historia-clinica-response.dto';
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

  async findHistoriaClinicaByMascota(
    idMascota: number,
    requester: JwtPayload,
  ): Promise<HistoriaClinicaResponseDto> {
    const mascota = await this.findMascota(idMascota);
    await this.verificarPermisoConsulta(mascota, requester);

    if (!mascota.historiaClinica) {
      return HistoriaClinicaResponseDto.vacia(idMascota);
    }

    const eventos = await this.eventosClinicosRepository.find({
      where: { historia: { idHistoria: mascota.historiaClinica.idHistoria } },
      relations: ['historia', 'historia.mascota', 'veterinario'],
      order: { fecha: 'ASC' },
    });

    return HistoriaClinicaResponseDto.fromEntity(
      mascota.historiaClinica,
      idMascota,
      eventos,
    );
  }

  /**
   * El dueño ve la historia de sus propias mascotas. El veterinario solo ve
   * la de sus pacientes: mascotas a las que ya les registró al menos un
   * evento clínico (no puede consultar mascotas ajenas por curiosidad).
   */
  private async verificarPermisoConsulta(
    mascota: Mascota,
    requester: JwtPayload,
  ): Promise<void> {
    const esDuenio = mascota.usuarios.some(
      (user) => user.idUsuario === requester.sub,
    );
    if (esDuenio) {
      return;
    }

    if (requester.rol === RoleName.VETERINARIO) {
      const veterinario = await this.veterinariosRepository.findOne({
        where: { usuario: { idUsuario: requester.sub } },
      });

      if (
        veterinario &&
        veterinario.estadoValidacion === ValidationStatus.APROBADO &&
        mascota.historiaClinica &&
        (await this.esPacienteDelVeterinario(mascota.historiaClinica.idHistoria, veterinario.idVeterinario))
      ) {
        return;
      }
    }

    throw new ForbiddenException({
      codigoEstado: 403,
      mensaje: 'No tiene permisos para acceder a este recurso',
    });
  }

  private async esPacienteDelVeterinario(
    idHistoria: number,
    idVeterinario: number,
  ): Promise<boolean> {
    const evento = await this.eventosClinicosRepository.findOne({
      where: {
        historia: { idHistoria },
        veterinario: { idVeterinario },
      },
    });

    return evento !== null;
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
      relations: ['historiaClinica', 'usuarios'],
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
