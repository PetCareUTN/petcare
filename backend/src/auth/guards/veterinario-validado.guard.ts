import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { ValidationStatus } from '../../common/enums/validation-status.enum';
import { Veterinario } from '../../veterinarios/entities/veterinario.entity';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * Guard reutilizable que verifica si un usuario con rol VETERINARIO
 * tiene una solicitud de validación con estado APROBADO.
 * Debe usarse después de JwtAuthGuard y RolesGuard.
 */
@Injectable()
export class VeterinarioValidadoGuard implements CanActivate {
  constructor(
    @InjectRepository(Veterinario)
    private readonly veterinariosRepository: Repository<Veterinario>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request['user'] as JwtPayload | undefined;

    if (!user) {
      throw new ForbiddenException({
        codigoEstado: 403,
        mensaje: 'No tiene permisos para acceder a este recurso',
      });
    }

    const veterinario = await this.veterinariosRepository.findOne({
      where: { usuario: { idUsuario: user.sub } },
    });

    if (!veterinario || veterinario.estadoValidacion !== ValidationStatus.APROBADO) {
      throw new ForbiddenException({
        codigoEstado: 403,
        mensaje: 'Su cuenta de veterinario no está validada',
      });
    }

    return true;
  }
}
