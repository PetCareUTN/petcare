import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { MailService } from '../mail/mail.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly mailService: MailService,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  findByDocument(numeroDocumento: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { numeroDocumento } });
  }

  findById(idUsuario: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { idUsuario } });
  }

  findByGoogleId(googleId: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { googleId } });
  }

  /** Asocia una cuenta de Google a un usuario que ya existía con contraseña. */
  async vincularGoogleId(idUsuario: number, googleId: string): Promise<void> {
    await this.usersRepository.update({ idUsuario }, { googleId });
  }

  async create(data: {
    nombre: string;
    apellido?: string | null;
    email: string;
    // Null en las cuentas creadas con Google: entran sin contraseña propia.
    password?: string | null;
    googleId?: string | null;
    idRol: number;
    numeroDocumento?: string | null;
    telefono?: string | null;
    direccion?: string | null;
    estado?: string;
    idVeterinarioAltaAsistida?: number | null;
  }): Promise<User> {
    const user = this.usersRepository.create({
      nombre: data.nombre,
      apellido: data.apellido ?? null,
      email: data.email,
      numeroDocumento: data.numeroDocumento ?? null,
      password: data.password ?? null,
      googleId: data.googleId ?? null,
      telefono: data.telefono ?? null,
      direccion: data.direccion ?? null,
      estado: data.estado ?? 'activo',
      idVeterinarioAltaAsistida: data.idVeterinarioAltaAsistida ?? null,
      rol: { idRol: data.idRol },
    });

    return this.usersRepository.save(user);
  }

  async update(idUsuario: number, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(idUsuario);
    if (!user) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'Usuario no encontrado',
      });
    }

    if (dto.email !== undefined && dto.email !== user.email) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje:
          'Para cambiar el email usá la opción de cambio de email con verificación',
      });
    }

    if (dto.numeroDocumento !== undefined && dto.numeroDocumento !== user.numeroDocumento) {
      const existingUser = await this.findByDocument(dto.numeroDocumento);
      if (existingUser) {
        throw new ConflictException({
          codigoEstado: 409,
          mensaje: 'El documento ya se encuentra registrado',
        });
      }
      user.numeroDocumento = dto.numeroDocumento;
    }

    if (dto.nombre !== undefined) {
      user.nombre = dto.nombre;
    }
    if (dto.apellido !== undefined) {
      user.apellido = dto.apellido;
    }
    if (dto.telefono !== undefined) {
      user.telefono = dto.telefono;
    }

    return this.usersRepository.save(user);
  }
  async updatePassword(idUsuario: number, passwordHash: string): Promise<User> {
    const user = await this.findById(idUsuario);

    if (!user) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'Usuario no encontrado',
      });
    }

    user.password = passwordHash;

    return this.usersRepository.save(user);
  }

  async activateIfPending(idUsuario: number): Promise<User> {
    const user = await this.findById(idUsuario);

    if (!user) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'Usuario no encontrado',
      });
    }

    if (user.estado === 'pendiente_activacion') {
      user.estado = 'activo';
    }

    return this.usersRepository.save(user);
  }

  async updatePasswordRecoveryData(
    idUsuario: number,
    codigoRecuperacion: string,
    fechaExpiracionCodigo: Date,
  ): Promise<User> {
    const user = await this.findById(idUsuario);

    if (!user) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'Usuario no encontrado',
      });
    }

    user.codigoRecuperacion = codigoRecuperacion;
    user.fechaExpiracionCodigo = fechaExpiracionCodigo;

    return this.usersRepository.save(user);
  }

  async clearRecoveryData(idUsuario: number): Promise<User> {
    const user = await this.findById(idUsuario);

    if (!user) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'Usuario no encontrado',
      });
    }

    user.codigoRecuperacion = null;
    user.fechaExpiracionCodigo = null;

    return this.usersRepository.save(user);
  }

  async solicitarCambioEmail(idUsuario: number, nuevoEmail: string) {
    const user = await this.findById(idUsuario);
    if (!user) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'Usuario no encontrado',
      });
    }

    if (nuevoEmail === user.email) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje: 'El nuevo email debe ser distinto al actual',
      });
    }

    const existingUser = await this.findByEmail(nuevoEmail);
    if (existingUser) {
      throw new ConflictException({
        codigoEstado: 409,
        mensaje: 'El email ya se encuentra registrado',
      });
    }

    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const codigoHash = await bcrypt.hash(codigo, SALT_ROUNDS);
    const fechaExpiracion = new Date(Date.now() + 10 * 60 * 1000);

    user.emailNuevo = nuevoEmail;
    user.codigoCambioEmail = codigoHash;
    user.fechaExpiracionCodigoEmail = fechaExpiracion;
    await this.usersRepository.save(user);

    await this.mailService.sendEmailChangeCode(user.email, codigo, nuevoEmail);

    return {
      mensaje: 'Se ha enviado un código de confirmación a tu email actual',
    };
  }

  async confirmarCambioEmail(idUsuario: number, codigo: string) {
    const user = await this.findById(idUsuario);
    if (!user) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'Usuario no encontrado',
      });
    }

    if (!user.emailNuevo || !user.codigoCambioEmail || !user.fechaExpiracionCodigoEmail) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje: 'No existe una solicitud de cambio de email activa',
      });
    }

    if (user.fechaExpiracionCodigoEmail < new Date()) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje: 'El código de cambio de email ha expirado',
      });
    }

    const codigoValido = await bcrypt.compare(codigo, user.codigoCambioEmail);
    if (!codigoValido) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje: 'Código de cambio de email incorrecto',
      });
    }

    const existingUser = await this.findByEmail(user.emailNuevo);
    if (existingUser) {
      throw new ConflictException({
        codigoEstado: 409,
        mensaje: 'El email ya se encuentra registrado',
      });
    }

    user.email = user.emailNuevo;
    user.emailNuevo = null;
    user.codigoCambioEmail = null;
    user.fechaExpiracionCodigoEmail = null;

    await this.usersRepository.save(user);

    return { mensaje: 'Email actualizado correctamente' };
  }
}
