import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { Role } from '../roles/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { AuditoriaUsuario } from './entities/auditoria-usuario.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    @InjectRepository(AuditoriaUsuario)
    private readonly auditoriaRepository: Repository<AuditoriaUsuario>,
  ) {}

  async listarUsuarios(
    pagina = 1,
    limite = 20,
    busqueda?: string,
  ): Promise<{ usuarios: User[]; total: number }> {
    const [usuarios, total] = await this.usersRepository.findAndCount({
      where: busqueda
        ? [
            { nombre: Like(`%${busqueda}%`) },
            { email: Like(`%${busqueda}%`) },
            { apellido: Like(`%${busqueda}%`) },
          ]
        : undefined,
      order: { fechaRegistro: 'DESC' },
      skip: (pagina - 1) * limite,
      take: limite,
    });

    return { usuarios, total };
  }

  async obtenerUsuario(idUsuario: number): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { idUsuario },
      relations: ['rol'],
    });

    if (!user) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'Usuario no encontrado',
      });
    }

    return user;
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
