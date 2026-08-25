import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { RoleName } from '../common/enums/role-name.enum';
import { ValidationStatus } from '../common/enums/validation-status.enum';
import { NotificationType } from '../common/enums/notification-type.enum';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { Role } from '../roles/entities/role.entity';
import { UsersService } from '../users/users.service';
import { RegisterVeterinarioDto } from './dto/register-veterinario.dto';
import { VeterinarioResponseDto } from './dto/veterinario-response.dto';
import { Veterinario } from './entities/veterinario.entity';
import type { UploadedDocumentFile } from './types/uploaded-document-file.type';

const SALT_ROUNDS = 10;

@Injectable()
export class VeterinariosService {
  constructor(
    @InjectRepository(Veterinario)
    private readonly veterinariosRepository: Repository<Veterinario>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    private readonly usersService: UsersService,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  private getPublicUrl(relativePath: string): string {
    const baseUrl = process.env.API_URL ?? 'http://localhost:3000';
    return `${baseUrl}/${relativePath}`;
  }

  private getRelativeMatriculaUrl(file: UploadedDocumentFile): string {
    return `uploads/matriculas/${file.filename}`;
  }

  private getRelativeHabilitacionUrl(file: UploadedDocumentFile): string {
    return `uploads/habilitaciones/${file.filename}`;
  }

  /**
   * Registro combinado para la web: crea la cuenta directamente con rol
   * veterinario y la solicitud de validación en un solo paso (en vez de
   * depender de que un dueño ya logueado pida ascender a veterinario, flujo
   * que además tenía un candado circular: para pedir la validación hacía
   * falta ya ser veterinario). El login queda bloqueado hasta que un admin
   * apruebe la solicitud (ver AuthService.login).
   */
  async registrarVeterinario(
    dto: RegisterVeterinarioDto,
    matriculaFile: UploadedDocumentFile | undefined,
    habilitacionFile: UploadedDocumentFile | undefined,
  ): Promise<{ mensaje: string }> {
    if (!matriculaFile) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje: 'La matrícula habilitante es obligatoria (imagen o PDF)',
      });
    }

    if (!habilitacionFile) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje: 'El certificado de habilitación es obligatorio (imagen o PDF)',
      });
    }

    const existente = await this.usersService.findByEmail(dto.email);
    if (existente) {
      throw new ConflictException({
        codigoEstado: 409,
        mensaje: 'El email ya se encuentra registrado',
      });
    }

    const rolVeterinario = await this.rolesRepository.findOne({
      where: { nombre: RoleName.VETERINARIO },
    });
    if (!rolVeterinario) {
      throw new Error(
        'No se encontró el rol "veterinario". Verifique el seed de roles.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const usuario = await this.usersService.create({
      nombre: dto.nombre,
      apellido: null,
      email: dto.email,
      password: passwordHash,
      idRol: rolVeterinario.idRol,
      telefono: dto.telefono,
      direccion: dto.direccion,
    });

    const veterinario = this.veterinariosRepository.create({
      usuario,
      numeroDocumento: dto.numeroDocumento,
      numeroMatricula: dto.numeroMatricula,
      provinciaMatricula: dto.provinciaMatricula,
      matriculaUrl: this.getRelativeMatriculaUrl(matriculaFile),
      habilitacionUrl: this.getRelativeHabilitacionUrl(habilitacionFile),
      estadoValidacion: ValidationStatus.PENDIENTE,
    });
    await this.veterinariosRepository.save(veterinario);

    await this.notificacionesService.crear(
      usuario.idUsuario,
      NotificationType.SOLICITUD_RECIBIDA,
      'Solicitud recibida',
      'Tu cuenta fue creada y tu matrícula quedó pendiente de revisión. Vas a poder iniciar sesión cuando un administrador la apruebe.',
    );

    return {
      mensaje:
        'Cuenta creada correctamente. Un administrador revisará tu matrícula antes de que puedas iniciar sesión.',
    };
  }

  async listarAprobados(): Promise<
    { idVeterinario: number; nombre: string; direccion: string | null }[]
  > {
    const veterinarios = await this.veterinariosRepository.find({
      where: { estadoValidacion: ValidationStatus.APROBADO },
      relations: ['usuario'],
    });

    return veterinarios
      .map((veterinario) => ({
        idVeterinario: veterinario.idVeterinario,
        nombre: veterinario.usuario.nombre,
        direccion: veterinario.usuario.direccion,
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
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
      habilitacionUrl: veterinario.habilitacionUrl
        ? this.getPublicUrl(veterinario.habilitacionUrl)
        : null,
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
