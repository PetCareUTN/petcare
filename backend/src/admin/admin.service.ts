import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Repository } from 'typeorm';
import { Role } from '../roles/entities/role.entity';
import { Suscripcion } from '../suscripciones/entities/suscripcion.entity';
import { User } from '../users/entities/user.entity';
import { AuditoriaUsuario } from './entities/auditoria-usuario.entity';
import { UsuarioAdminResponseDto } from './dto/usuario-admin-response.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    @InjectRepository(AuditoriaUsuario)
    private readonly auditoriaRepository: Repository<AuditoriaUsuario>,
    @InjectRepository(Suscripcion)
    private readonly suscripcionesRepository: Repository<Suscripcion>,
  ) {}

  async listarUsuarios(
    pagina = 1,
    limite = 20,
    busqueda?: string,
  ): Promise<{ usuarios: UsuarioAdminResponseDto[]; total: number }> {
    const [usuarios, total] = await this.usersRepository.findAndCount({
      where: busqueda
        ? [
            { nombre: Like(`%${busqueda}%`) },
            { email: Like(`%${busqueda}%`) },
            { apellido: Like(`%${busqueda}%`) },
          ]
        : undefined,
      relations: ['veterinario'],
      order: { fechaRegistro: 'DESC' },
      skip: (pagina - 1) * limite,
      take: limite,
    });

    const suscripciones = await this.cargarSuscripciones(
      usuarios.map((u) => u.idUsuario),
    );

    return {
      usuarios: usuarios.map((u) =>
        UsuarioAdminResponseDto.fromEntity(u, suscripciones.get(u.idUsuario)),
      ),
      total,
    };
  }

  async obtenerUsuario(idUsuario: number): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { idUsuario },
      relations: ['rol', 'veterinario'],
    });

    if (!user) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'Usuario no encontrado',
      });
    }

    return user;
  }

  /**
   * Detalle para el panel del admin con el estado real (validación +
   * suscripción) en lugar del estado genérico de la cuenta.
   */
  async obtenerUsuarioAdmin(
    idUsuario: number,
  ): Promise<UsuarioAdminResponseDto> {
    const user = await this.obtenerUsuario(idUsuario);
    const suscripciones = await this.cargarSuscripciones([user.idUsuario]);
    return UsuarioAdminResponseDto.fromEntity(
      user,
      suscripciones.get(user.idUsuario),
    );
  }

  /**
   * Suscripción de cada usuario en una sola query (1:1 con `usuarios`).
   */
  private async cargarSuscripciones(
    idUsuarios: number[],
  ): Promise<Map<number, Suscripcion>> {
    if (idUsuarios.length === 0) {
      return new Map();
    }
    const suscripciones = await this.suscripcionesRepository.find({
      where: { usuario: { idUsuario: In(idUsuarios) } },
    });
    return new Map(suscripciones.map((s) => [s.usuario.idUsuario, s] as const));
  }

  async cambiarRol(idUsuario: number, idRol: number): Promise<User> {
    const user = await this.obtenerUsuario(idUsuario);

    const rolAnterior = user.rol.idRol;

    const nuevoRol = await this.rolesRepository.findOne({
      where: { idRol },
    });

    if (!nuevoRol) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'Rol no encontrado',
      });
    }

    user.rol = nuevoRol;
    await this.usersRepository.save(user);

    await this.auditoriaRepository.save(
      this.auditoriaRepository.create({
        idUsuario,
        tipoAccion: 'cambio_rol',
        detalle: { id_rol_anterior: rolAnterior, id_rol_nuevo: idRol },
      }),
    );

    return user;
  }

  async listarRoles(): Promise<Role[]> {
    return this.rolesRepository.find();
  }

  async obtenerHistorial(idUsuario: number): Promise<AuditoriaUsuario[]> {
    return this.auditoriaRepository.find({
      where: { idUsuario },
      order: { fechaAccion: 'DESC' },
    });
  }
}
