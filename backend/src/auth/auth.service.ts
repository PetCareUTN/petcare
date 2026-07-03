import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { RoleName } from '../common/enums/role-name.enum';
import { Role } from '../roles/entities/role.entity';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { RegisterResponseDto } from './dto/register-response.dto';

const SALT_ROUNDS = 10;
const DEFAULT_ROLE = RoleName.DUENO_MASCOTA;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
  ) {}

  async register(dto: RegisterDto): Promise<RegisterResponseDto> {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException({
        codigoEstado: 409,
        mensaje: 'El email ya se encuentra registrado',
      });
    }

    const defaultRole = await this.rolesRepository.findOne({
      where: { nombre: DEFAULT_ROLE },
    });
    if (!defaultRole) {
      throw new Error(
        `No se encontró el rol por defecto "${DEFAULT_ROLE}". Verifique el seed de roles.`,
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.usersService.create({
      nombre: dto.nombre,
      apellido: dto.apellido,
      email: dto.email,
      password: passwordHash,
      idRol: defaultRole.idRol,
    });
    user.rol = defaultRole;

    return RegisterResponseDto.fromEntity(user);
  }
}
