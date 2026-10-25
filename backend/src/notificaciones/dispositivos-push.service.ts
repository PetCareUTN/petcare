import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificacionResponseDto } from './dto/notificacion-response.dto';
import { DispositivoPush } from './entities/dispositivo-push.entity';
import { PushService } from './push.service';

@Injectable()
export class DispositivosPushService {
  private readonly logger = new Logger(DispositivosPushService.name);

  constructor(
    @InjectRepository(DispositivoPush)
    private readonly dispositivosRepository: Repository<DispositivoPush>,
    private readonly pushService: PushService,
  ) {}

  /**
   * Registra el dispositivo donde la persona acaba de iniciar sesión.
   *
   * Si el token ya existía se reasigna al usuario actual en vez de duplicarlo:
   * es el mismo teléfono cambiando de cuenta, y los avisos tienen que seguir a
   * quien lo está usando (ver `DispositivoPush`).
   */
  async registrar(
    idUsuario: number,
    token: string,
    plataforma = 'android',
  ): Promise<void> {
    const existente = await this.dispositivosRepository.findOne({
      where: { token },
      relations: ['usuario'],
    });

    if (existente) {
      existente.usuario = { idUsuario } as DispositivoPush['usuario'];
      existente.plataforma = plataforma;
      await this.dispositivosRepository.save(existente);
      return;
    }

    await this.dispositivosRepository.save(
      this.dispositivosRepository.create({
        usuario: { idUsuario } as DispositivoPush['usuario'],
        token,
        plataforma,
      }),
    );
  }

  /**
   * Da de baja el dispositivo al cerrar sesión.
   *
   * Pide el id de usuario además del token para que una sesión no pueda dar de
   * baja el dispositivo de otra persona conociendo su token.
   */
  async eliminar(idUsuario: number, token: string): Promise<void> {
    await this.dispositivosRepository.delete({
      token,
      usuario: { idUsuario },
    });
  }

  /**
   * Manda la notificación a todos los dispositivos del destinatario.
   *
   * No lanza: el push es un canal extra y la notificación interna ya quedó
   * guardada, así que un fallo acá no puede romper la operación que la originó
   * (confirmar un turno, registrar una detección).
   */
  async enviarNotificacion(
    idUsuario: number,
    notificacion: NotificacionResponseDto,
  ): Promise<number> {
    if (!this.pushService.habilitado) return 0;

    try {
      const dispositivos = await this.dispositivosRepository.find({
        where: { usuario: { idUsuario } },
      });
      if (dispositivos.length === 0) return 0;

      const datos = this.datosDeNavegacion(notificacion);
      let entregados = 0;

      for (const dispositivo of dispositivos) {
        const resultado = await this.pushService.enviar({
          token: dispositivo.token,
          titulo: notificacion.titulo,
          cuerpo: notificacion.cuerpo,
          datos,
        });

        if (resultado.entregado) {
          entregados += 1;
        } else if (resultado.tokenInvalido) {
          // El teléfono desinstaló la app o FCM rotó el token: dejarlo haría
          // que se reintente para siempre contra un destino que no existe.
          await this.dispositivosRepository.delete({
            idDispositivo: dispositivo.idDispositivo,
          });
        }
      }

      return entregados;
    } catch (error) {
      this.logger.error(
        `No se pudo enviar el push de la notificación ${notificacion.idNotificacion}`,
        error instanceof Error ? error.stack : undefined,
      );
      return 0;
    }
  }

  /**
   * Lo que necesita la app para abrir la pantalla correcta al tocar el aviso.
   * Son los mismos campos que ya trae la notificación interna, pasados a texto
   * porque FCM no acepta otra cosa en `data`.
   */
  private datosDeNavegacion(
    notificacion: NotificacionResponseDto,
  ): Record<string, string> {
    const datos: Record<string, string> = {
      idNotificacion: String(notificacion.idNotificacion),
      tipo: notificacion.tipo,
    };

    if (notificacion.idReferencia !== null) {
      datos.idReferencia = String(notificacion.idReferencia);
    }
    if (notificacion.tipoReferencia !== null) {
      datos.tipoReferencia = notificacion.tipoReferencia;
    }

    return datos;
  }
}
