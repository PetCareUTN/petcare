import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { RoleName } from '../common/enums/role-name.enum';
import { Role } from '../roles/entities/role.entity';
import { UserPublicDto } from '../users/dto/user-public.dto';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { RegisterDto } from './dto/register.dto';
import { RegisterResponseDto } from './dto/register-response.dto';

const SALT_ROUNDS = 10;
const DEFAULT_ROLE = RoleName.DUENO_MASCOTA;

// Hash bcrypt ficticio (válido en formato) usado cuando el email no existe,
// para que bcrypt.compare tarde lo mismo que con un usuario real y no se pueda
// deducir por tiempo de respuesta si la cuenta existe (US-02, criterio 3).
const DUMMY_HASH =
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
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

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.usersService.findByEmail(dto.email);

    // Se compara siempre (contra un hash ficticio si el usuario no existe)
    // para no revelar por tiempo de respuesta si la cuenta existe.
    const passwordMatches = await bcrypt.compare(
      dto.password,
      user?.password ?? DUMMY_HASH,
    );

    if (!user || !passwordMatches) {
      throw new UnauthorizedException({
        codigoEstado: 401,
        mensaje: 'Email o contraseña incorrectos',
      });
    }

    const payload: JwtPayload = {
      sub: user.idUsuario,
      email: user.email,
      idRol: user.rol.idRol,
      rol: user.rol.nombre,
    };
    const token = await this.jwtService.signAsync(payload);

    return LoginResponseDto.build(token, user);
  }

  async getProfile(userId: number): Promise<UserPublicDto> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException({
        codigoEstado: 401,
        mensaje: 'No autorizado',
      });
    }

    return UserPublicDto.fromEntity(user);
  }
}
