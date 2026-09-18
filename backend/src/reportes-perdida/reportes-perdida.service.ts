import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportePerdidaEstado } from '../common/enums/reporte-perdida-estado.enum';
import { Mascota } from '../mascotas/entities/mascota.entity';
import { User } from '../users/entities/user.entity';
import { CreateReportePerdidaDto } from './dto/create-reporte-perdida.dto';
import { ReportePerdidaResponseDto } from './dto/reporte-perdida-response.dto';
import { ReportePerdida } from './entities/reporte-perdida.entity';

@Injectable()
export class ReportesPerdidaService {
  constructor(
    @InjectRepository(ReportePerdida)
    private readonly reportesRepository: Repository<ReportePerdida>,
    @InjectRepository(Mascota)
    private readonly mascotasRepository: Repository<Mascota>,
  ) {}

  async crear(
    idUsuario: number,
    dto: CreateReportePerdidaDto,
  ): Promise<ReportePerdidaResponseDto> {
    const mascota = await this.findMascotaAndVerifyOwner(
      dto.idMascota,
      idUsuario,
    );

    const reporteActivo = await this.findReporteActivo(mascota.idMascota);
    if (reporteActivo) {
      throw new ConflictException({
        codigoEstado: 409,
        mensaje: 'La mascota ya está reportada como perdida',
      });
    }

    const reporte = this.reportesRepository.create({
      mascota,
      usuario: { idUsuario } as User,
      estado: ReportePerdidaEstado.ACTIVO,
      fechaPerdida: dto.fechaPerdida ? new Date(dto.fechaPerdida) : new Date(),
      latitud: dto.latitud,
      longitud: dto.longitud,
      descripcion: dto.descripcion?.trim() || null,
      contacto: dto.contacto?.trim() || null,
      fechaCierre: null,
    });

    const guardado = await this.reportesRepository.save(reporte);
    return ReportePerdidaResponseDto.fromEntity(guardado);
  }

  /** Reportes abiertos de todas las mascotas del usuario. */
  async listarActivosDelUsuario(
    idUsuario: number,
  ): Promise<ReportePerdidaResponseDto[]> {
    const reportes = await this.reportesRepository
      .createQueryBuilder('reporte')
      .innerJoinAndSelect('reporte.mascota', 'mascota')
      .innerJoin('mascota.usuarios', 'usuario')
      .where('reporte.estado = :estado', {
        estado: ReportePerdidaEstado.ACTIVO,
      })
      .andWhere('usuario.idUsuario = :idUsuario', { idUsuario })
      .orderBy('reporte.fechaPerdida', 'DESC')
      .getMany();

    return reportes.map((reporte) =>
      ReportePerdidaResponseDto.fromEntity(reporte),
    );
  }

  /** Cierra el reporte: la mascota apareció y deja de aceptar detecciones. */
  async cerrar(
    idReporte: number,
    idUsuario: number,
  ): Promise<ReportePerdidaResponseDto> {
    const reporte = await this.reportesRepository.findOne({
      where: { idReporte },
      relations: ['mascota', 'mascota.usuarios'],
    });

    if (!reporte) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'Reporte no encontrado',
      });
    }

    this.ensureDuenio(reporte.mascota, idUsuario);

    if (reporte.estado === ReportePerdidaEstado.CERRADO) {
      throw new ConflictException({
        codigoEstado: 409,
        mensaje: 'El reporte ya fue cerrado',
      });
    }

    reporte.estado = ReportePerdidaEstado.CERRADO;
    reporte.fechaCierre = new Date();

    const guardado = await this.reportesRepository.save(reporte);
    return ReportePerdidaResponseDto.fromEntity(guardado);
  }

  /**
   * Una mascota está "perdida" mientras tenga un reporte abierto. La ingesta de
   * detecciones BLE (US-31) usa esto para descartar las detecciones de mascotas
   * que no están reportadas o cuyo reporte ya se cerró.
   */
  async tieneReporteActivo(idMascota: number): Promise<boolean> {
    const reporte = await this.findReporteActivo(idMascota);
    return reporte !== null;
  }

  private findReporteActivo(idMascota: number): Promise<ReportePerdida | null> {
    return this.reportesRepository.findOne({
      where: {
        mascota: { idMascota },
        estado: ReportePerdidaEstado.ACTIVO,
      },
    });
  }

  private async findMascotaAndVerifyOwner(
    idMascota: number,
    idUsuario: number,
  ): Promise<Mascota> {
    const mascota = await this.mascotasRepository.findOne({
      where: { idMascota },
      relations: ['usuarios'],
    });

    if (!mascota) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'Mascota no encontrada',
      });
    }

    this.ensureDuenio(mascota, idUsuario);
    return mascota;
  }

  private ensureDuenio(mascota: Mascota, idUsuario: number): void {
    const esDuenio = mascota.usuarios?.some(
      (user) => user.idUsuario === idUsuario,
    );

    if (!esDuenio) {
      throw new ForbiddenException({
        codigoEstado: 403,
        mensaje: 'No tiene permisos para acceder a este recurso',
      });
    }
  }
}
