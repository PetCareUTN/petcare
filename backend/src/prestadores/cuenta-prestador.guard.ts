import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Request } from 'express';
import { User } from '../users/entities/user.entity';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

/** Usa el rol vigente, incluso si una cuenta fue suspendida o cambió de rol tras emitir el JWT. */
@Injectable()
export class CuentaPrestadorGuard implements CanActivate {
  constructor(private readonly db: DataSource) {}
  async canActivate(context: ExecutionContext) {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user: JwtPayload }>();
    const usuario = await this.db
      .getRepository(User)
      .findOneBy({ idUsuario: request.user.sub });
    if (!usuario || usuario.estado !== 'activo')
      throw new ForbiddenException('La cuenta no está activa.');
    request.user.rol = usuario.rol.nombre;
    return true;
  }
}
