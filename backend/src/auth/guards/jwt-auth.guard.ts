import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * Protege rutas exigiendo un token JWT válido en el header
 * `Authorization: Bearer <token>`. Si es válido, adjunta el payload en
 * `request.user` para que los controladores puedan leerlo.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException({
        codigoEstado: 401,
        mensaje: 'No autorizado',
      });
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      request['user'] = payload;
      return true;
    } catch {
      throw new UnauthorizedException({
        codigoEstado: 401,
        mensaje: 'No autorizado',
      });
    }
  }

  private extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
