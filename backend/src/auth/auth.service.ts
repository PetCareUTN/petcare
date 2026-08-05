import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { RoleName } from '../common/enums/role-name.enum';
import { ValidationStatus } from '../common/enums/validation-status.enum';
import { Role } from '../roles/entities/role.entity';
import { UserPublicDto } from '../users/dto/user-public.dto';
import { UsersService } from '../users/users.service';
import { Veterinario } from '../veterinarios/entities/veterinario.entity';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { RegisterDto } from './dto/register.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { CambiarContraseñaDto } from './dto/cambiar-contrasena.dto';
import { RestablecerContrasenaDto } from './dto/restablecer-contrasena.dto';
import { MailService } from 'src/mail/mail.service';

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
    private readonly mailService: MailService,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    @InjectRepository(Veterinario)
    private readonly veterinariosRepository: Repository<Veterinario>,
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

    if (user.rol.nombre === RoleName.VETERINARIO) {
      await this.verificarVeterinarioAprobado(user.idUsuario);
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

  private async verificarVeterinarioAprobado(idUsuario: number): Promise<void> {
    const veterinario = await this.veterinariosRepository.findOne({
      where: { usuario: { idUsuario } },
    });

    if (!veterinario || veterinario.estadoValidacion === ValidationStatus.PENDIENTE) {
      throw new ForbiddenException({
        codigoEstado: 403,
        mensaje:
          'Tu cuenta de veterinario todavía no fue validada por un administrador.',
      });
    }

    if (veterinario.estadoValidacion === ValidationStatus.RECHAZADO) {
      throw new ForbiddenException({
        codigoEstado: 403,
        mensaje: `Tu solicitud de validación fue rechazada. Motivo: ${veterinario.motivoRechazo ?? 'sin especificar'}.`,
      });
    }
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
  async changePassword(userId: number, dto: CambiarContraseñaDto){
    // Verificar si el usuario existe
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'Usuario no encontrado',
      });
    }
    // Comparar contraseña vieja con la contraseña almacenada
    const passwordMatches = await bcrypt.compare(dto.viejaContraseña, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException({
        codigoEstado: 401,
        mensaje: 'Contraseña actual incorrecta',
      });
    }
    // Guardar contrseña nueva hasheada en la BD
    const nuevaContraseñaHash = await bcrypt.hash(dto.nuevaContraseña, SALT_ROUNDS);
    await this.usersService.updatePassword(userId, nuevaContraseñaHash);
    return { mensaje: 'Contraseña cambiada exitosamente' };
}

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if(user) {
      const codigo = Math.floor(100000 + Math.random() * 900000).toString();
      const fechaExpiracion = new Date(Date.now() + 10 * 60 * 1000);
      const codigoHash = await bcrypt.hash(codigo, SALT_ROUNDS);

      await this.usersService.updatePasswordRecoveryData(user.idUsuario, codigoHash, fechaExpiracion);
      await this.mailService.sendRecoveryCode(user.email, codigo);
    }

    return { mensaje: 'Si el email está registrado, se ha enviado un código para restablecer la contraseña',}
  }

  async resetPassword(dto: RestablecerContrasenaDto) {
  // Buscar usuario por email
  const user = await this.usersService.findByEmail(dto.email);

  if (!user) {
    throw new BadRequestException({
      codigoEstado: 400,
      mensaje: 'Código o email inválido',
    });
  }

  // Verificar que exista una solicitud de recuperación
  if (!user.codigoRecuperacion || !user.fechaExpiracionCodigo) {
    throw new BadRequestException({
      codigoEstado: 400,
      mensaje: 'No existe una solicitud de recuperación activa',
    });
  }

  // Verificar que el código no haya expirado
  if (user.fechaExpiracionCodigo < new Date()) {
    throw new BadRequestException({
      codigoEstado: 400,
      mensaje: 'El código de recuperación ha expirado',
    });
  }

  // Comparar el código ingresado con el hash almacenado
  const codigoValido = await bcrypt.compare(
    dto.codigo,
    user.codigoRecuperacion,
  );

  if (!codigoValido) {
    throw new BadRequestException({
      codigoEstado: 400,
      mensaje: 'Código de recuperación incorrecto',
    });
  }

  // Hashear la nueva contraseña
  const nuevaPasswordHash = await bcrypt.hash(
    dto.nuevaContraseña,
    SALT_ROUNDS,
  );

  // Actualizar la contraseña
  await this.usersService.updatePassword(
    user.idUsuario,
    nuevaPasswordHash,
  );

  // Limpiar los datos de recuperación
  await this.usersService.clearRecoveryData(
    user.idUsuario,
  );

  return {
    mensaje: 'Contraseña restablecida correctamente',
  };
}
}
