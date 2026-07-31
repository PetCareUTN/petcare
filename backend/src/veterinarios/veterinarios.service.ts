import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ValidationStatus } from '../common/enums/validation-status.enum';
import { NotificationType } from '../common/enums/notification-type.enum';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { VeterinarioResponseDto } from './dto/veterinario-response.dto';
import { Veterinario } from './entities/veterinario.entity';
import type { UploadedDocumentFile } from './types/uploaded-document-file.type';

@Injectable()
export class VeterinariosService {
  constructor(
    @InjectRepository(Veterinario)
    private readonly veterinariosRepository: Repository<Veterinario>,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  private getPublicUrl(relativePath: string): string {
    const baseUrl = process.env.API_URL ?? 'http://localhost:3000';
    return `${baseUrl}/${relativePath}`;
  }

  private getRelativeMatriculaUrl(file: UploadedDocumentFile): string {
    return `uploads/matriculas/${file.filename}`;
  }

  async crearSolicitud(
    idUsuario: number,
    body: Record<string, string>,
    file: UploadedDocumentFile,
  ): Promise<VeterinarioResponseDto> {
    if (!file) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje: 'La matrícula habilitante es obligatoria (imagen o PDF)',
      });
    }

    const { numeroDocumento, numeroMatricula, provinciaMatricula } = body;

    if (!numeroDocumento || !numeroMatricula || !provinciaMatricula) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje: 'Los campos numeroDocumento, numeroMatricula y provinciaMatricula son obligatorios',
      });
    }

    const existente = await this.veterinariosRepository.findOne({
      where: { usuario: { idUsuario } },
    });

    if (existente && existente.estadoValidacion !== ValidationStatus.RECHAZADO) {
      throw new ConflictException({
        codigoEstado: 409,
        mensaje: 'Ya existe una solicitud de validación para este usuario',
      });
    }

    if (existente && existente.estadoValidacion === ValidationStatus.RECHAZADO) {
      existente.numeroDocumento = numeroDocumento;
      existente.numeroMatricula = numeroMatricula;
      existente.provinciaMatricula = provinciaMatricula;
      existente.matriculaUrl = this.getRelativeMatriculaUrl(file);
      existente.estadoValidacion = ValidationStatus.PENDIENTE;
      existente.motivoRechazo = null;

      const guardado = await this.veterinariosRepository.save(existente);

      await this.notificacionesService.crear(
        idUsuario,
        NotificationType.SOLICITUD_RECIBIDA,
        'Solicitud recibida',
        'Tu solicitud de validación fue recibida y está pendiente de revisión.',
      );

      return VeterinarioResponseDto.fromEntity(guardado);
    }

    const veterinario = this.veterinariosRepository.create({
      usuario: { idUsuario } as any,
      numeroDocumento,
      numeroMatricula,
      provinciaMatricula,
      matriculaUrl: this.getRelativeMatriculaUrl(file),
      estadoValidacion: ValidationStatus.PENDIENTE,
    });

    const guardado = await this.veterinariosRepository.save(veterinario);

    await this.notificacionesService.crear(
      idUsuario,
      NotificationType.SOLICITUD_RECIBIDA,
      'Solicitud recibida',
      'Tu solicitud de validación fue recibida y está pendiente de revisión.',
    );

    return VeterinarioResponseDto.fromEntity(guardado);
  }

  async obtenerEstado(idUsuario: number): Promise<VeterinarioResponseDto> {
    const veterinario = await this.veterinariosRepository.findOne({
      where: { usuario: { idUsuario } },
    });

    if (!veterinario) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'No se encontró solicitud de validación para este usuario',
      });
    }

    return VeterinarioResponseDto.fromEntity(veterinario);
  }

  async listarPendientes() {
    const solicitudes = await this.veterinariosRepository.find({
      where: { estadoValidacion: ValidationStatus.PENDIENTE },
      relations: ['usuario'],
      order: { createdAt: 'ASC' },
    });

    return solicitudes.map((s) => ({
      idVeterinario: s.idVeterinario,
      nombre: s.usuario.nombre,
      apellido: s.usuario.apellido,
      email: s.usuario.email,
      fechaSolicitud: s.createdAt,
    }));
  }

  async obtenerDetalle(idVeterinario: number) {
    const veterinario = await this.veterinariosRepository.findOne({
      where: { idVeterinario },
      relations: ['usuario'],
    });

    if (!veterinario) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'No se encontró la solicitud de validación',
      });
    }

    return {
      idVeterinario: veterinario.idVeterinario,
      numeroDocumento: veterinario.numeroDocumento,
      numeroMatricula: veterinario.numeroMatricula,
      provinciaMatricula: veterinario.provinciaMatricula,
      matriculaUrl: this.getPublicUrl(veterinario.matriculaUrl),
      estadoValidacion: veterinario.estadoValidacion,
      motivoRechazo: veterinario.motivoRechazo,
      fechaSolicitud: veterinario.createdAt,
      usuario: {
        idUsuario: veterinario.usuario.idUsuario,
        nombre: veterinario.usuario.nombre,
        apellido: veterinario.usuario.apellido,
        email: veterinario.usuario.email,
      },
    };
  }

  async aprobar(idVeterinario: number) {
    const veterinario = await this.veterinariosRepository.findOne({
      where: { idVeterinario },
      relations: ['usuario'],
    });

    if (!veterinario) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'No se encontró la solicitud de validación',
      });
    }

    if (veterinario.estadoValidacion !== ValidationStatus.PENDIENTE) {
      throw new ConflictException({
        codigoEstado: 409,
        mensaje: 'La solicitud ya fue procesada',
      });
    }

    veterinario.estadoValidacion = ValidationStatus.APROBADO;
    await this.veterinariosRepository.save(veterinario);

    await this.notificacionesService.crear(
      veterinario.usuario.idUsuario,
      NotificationType.APROBACION,
      'Cuenta aprobada',
      'Tu cuenta de veterinario ha sido validada correctamente. Ya podés acceder a las funcionalidades profesionales.',
    );

    return { mensaje: 'Solicitud aprobada correctamente' };
  }

  async rechazar(idVeterinario: number, motivoRechazo: string) {
    const veterinario = await this.veterinariosRepository.findOne({
      where: { idVeterinario },
      relations: ['usuario'],
    });

    if (!veterinario) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'No se encontró la solicitud de validación',
      });
    }

    if (veterinario.estadoValidacion !== ValidationStatus.PENDIENTE) {
      throw new ConflictException({
        codigoEstado: 409,
        mensaje: 'La solicitud ya fue procesada',
      });
    }

    veterinario.estadoValidacion = ValidationStatus.RECHAZADO;
    veterinario.motivoRechazo = motivoRechazo;
    await this.veterinariosRepository.save(veterinario);

    await this.notificacionesService.crear(
      veterinario.usuario.idUsuario,
      NotificationType.RECHAZO,
      'Solicitud rechazada',
      `Tu solicitud de validación fue rechazada. Motivo: ${motivoRechazo}`,
    );

    return { mensaje: 'Solicitud rechazada correctamente' };
  }
}
