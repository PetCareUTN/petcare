import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  findById(idUsuario: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { idUsuario } });
  }

  async create(data: {
    nombre: string;
    apellido?: string | null;
    email: string;
    password: string;
    idRol: number;
    telefono?: string | null;
    direccion?: string | null;
    estado?: string;
    idVeterinarioAltaAsistida?: number | null;
  }): Promise<User> {
    const user = this.usersRepository.create({
      nombre: data.nombre,
      apellido: data.apellido ?? null,
      email: data.email,
      password: data.password,
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
      const existingUser = await this.findByEmail(dto.email);
      if (existingUser) {
        throw new ConflictException({
          codigoEstado: 409,
          mensaje: 'El email ya se encuentra registrado',
        });
      }
      user.email = dto.email;
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
}
