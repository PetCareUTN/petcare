import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationType } from '../common/enums/notification-type.enum';
import { Notificacion } from './entities/notificacion.entity';
import { NotificacionResponseDto } from './dto/notificacion-response.dto';

@Injectable()
export class NotificacionesService {
  constructor(
    @InjectRepository(Notificacion)
    private readonly notificacionesRepository: Repository<Notificacion>,
  ) {}

  async crear(
    idUsuario: number,
    tipo: NotificationType,
    titulo: string,
    cuerpo: string,
  ): Promise<NotificacionResponseDto> {
    const notificacion = this.notificacionesRepository.create({
      usuario: { idUsuario } as any,
      tipo,
      titulo,
      cuerpo,
      leida: false,
    });

    const guardada = await this.notificacionesRepository.save(notificacion);
    return NotificacionResponseDto.fromEntity(guardada);
  }

  async listarPorUsuario(idUsuario: number): Promise<NotificacionResponseDto[]> {
    const notificaciones = await this.notificacionesRepository.find({
      where: { usuario: { idUsuario } },
      order: { fechaEnvio: 'DESC' },
    });

    return notificaciones.map((n) => NotificacionResponseDto.fromEntity(n));
  }

  async marcarLeida(idNotificacion: number, idUsuario: number) {
    const notificacion = await this.notificacionesRepository.findOne({
      where: { idNotificacion, usuario: { idUsuario } },
    });

    if (!notificacion) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'No se encontró la notificación',
      });
    }

    notificacion.leida = true;
    await this.notificacionesRepository.save(notificacion);

    return { mensaje: 'Notificación marcada como leída' };
  }
}
