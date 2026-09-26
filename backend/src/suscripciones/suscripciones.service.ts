import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MercadoPagoConfig,
  Payment,
  PreApproval,
  WebhookSignatureValidator,
} from 'mercadopago';
import { NotificationType } from '../common/enums/notification-type.enum';
import { SuscripcionEstado } from '../common/enums/suscripcion-estado.enum';
import { ValidationStatus } from '../common/enums/validation-status.enum';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { User } from '../users/entities/user.entity';
import { Veterinario } from '../veterinarios/entities/veterinario.entity';
import { PagoResponseDto } from './dto/pago-response.dto';
import { SuscripcionResponseDto } from './dto/suscripcion-response.dto';
import { PagoSuscripcion } from './entities/pago-suscripcion.entity';
import { Suscripcion } from './entities/suscripcion.entity';

const DIA_EN_MS = 24 * 60 * 60 * 1000;
const DIAS_PERIODOS = 30;

/**
 * Resultado de evaluar el acceso de un veterinario a la plataforma.
 *
 * `codigo` es un código interno (para que el frontend decida a dónde
 * redirigir) y `motivo` el mensaje legible para mostrarle al usuario.
 */
export interface AccesoPlataforma {
  accesoPermitido: boolean;
  codigo: string | null;
  motivo: string | null;
}

/** Estados de pago que Mercado Pago puede devolver en un payment. */
const PAGO_POR_ESTADO_MP: Record<
  string,
  'pendiente' | 'aprobado' | 'rechazado' | 'cancelado'
> = {
  pending: 'pendiente',
  in_process: 'pendiente',
  authorized: 'aprobado',
  approved: 'aprobado',
  rejected: 'rechazado',
  cancelled: 'cancelado',
  refunded: 'rechazado',
  charged_back: 'rechazado',
};

@Injectable()
export class SuscripcionesService {
  private readonly logger = new Logger(SuscripcionesService.name);
  private readonly preApproval: PreApproval;
  private readonly payment: Payment;

  constructor(
    @InjectRepository(Suscripcion)
    private readonly suscripcionesRepository: Repository<Suscripcion>,
    @InjectRepository(PagoSuscripcion)
    private readonly pagosRepository: Repository<PagoSuscripcion>,
    @InjectRepository(Veterinario)
    private readonly veterinariosRepository: Repository<Veterinario>,
    private readonly notificacionesService: NotificacionesService,
  ) {
    const config = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN ?? '',
    });
    this.preApproval = new PreApproval(config);
    this.payment = new Payment(config);
  }

  private get monto(): number {
    return Number(process.env.SUSCRIPCION_MONTO ?? 1000);
  }

  private get moneda(): string {
    return process.env.SUSCRIPCION_MONEDA ?? 'ARS';
  }

  private get diasGracia(): number {
    return Number(process.env.SUSCRIPCION_GRACIA_DIAS ?? 3);
  }

  /**
   * back_url que recibe Mercado Pago: el endpoint público de retorno del
   * propio backend, que después redirige al navegador del veterinario al
   * frontend (ver urlRetornoFrontend). Así el checkout funciona con un solo
   * túnel (el del backend): MP solo necesita una URL pública accesible.
   *
   * Orden: API_PUBLIC_URL (túnel) → API_URL → localhost.
   * Mercado Pago rechaza back_url con localhost: para probar el checkout hace
   * falta API_PUBLIC_URL. Ver docs/suscripciones-mp-local.md.
   */
  private get backUrl(): string {
    const base = this.normalizarUrl(
      this.urlBasePublica(
        [
          ['API_PUBLIC_URL', process.env.API_PUBLIC_URL],
          ['API_URL', process.env.API_URL],
        ],
        'http://localhost:3000',
      ),
    );
    if (this.esHostLocal(base)) {
      this.logger.warn(
        `back_url local (${base}/suscripciones/retorno): Mercado Pago rechaza ` +
          'las URLs localhost. Seteá API_PUBLIC_URL con la URL pública (túnel) del backend.',
      );
    }
    return `${base}/suscripciones/retorno`;
  }

  /**
   * Destino de la redirección del navegador después del checkout: la pantalla
   * "Mi suscripción" del frontend de desarrollo.
   *
   * Orden: FRONTEND_PUBLIC_URL → el **primer origen** de CORS_ORIGIN (que
   * puede ser una lista por coma) → localhost:4200. Se resuelve en el
   * backend, nunca a partir de datos del request (no hay open-redirect).
   */
  urlRetornoFrontend(): string {
    const base = this.normalizarUrl(
      this.urlBasePublica(
        [
          ['FRONTEND_PUBLIC_URL', process.env.FRONTEND_PUBLIC_URL],
          ['CORS_ORIGIN', process.env.CORS_ORIGIN],
        ],
        'http://localhost:4200',
      ),
    );
    return `${base}/suscripciones`;
  }

  /**
   * URL pública del backend a la que Mercado Pago envía los webhooks
   * (notification_url). MP exige una URL accesible desde internet: sin una
   * URL de túnel apunta a localhost y los eventos no llegan.
   *
   * Orden: API_PUBLIC_URL (túnel) → API_URL → localhost.
   */
  private get webhookUrl(): string {
    const base = this.normalizarUrl(
      this.urlBasePublica(
        [
          ['API_PUBLIC_URL', process.env.API_PUBLIC_URL],
          ['API_URL', process.env.API_URL],
        ],
        'http://localhost:3000',
      ),
    );
    return `${base}/suscripciones/webhook`;
  }

  /**
   * Resuelve la URL base pública a partir de las variables candidatas, en
   * orden de prioridad. De cada valor toma solo el primer segmento (por si es
   * una lista, como CORS_ORIGIN con varios orígenes).
   *
   * Si un valor seteado no tiene forma de URL http(s) válida, lo avisa y sigue
   * con la siguiente candidata; si ninguna sirve, devuelve la local por
   * defecto. Nunca manda una URL malformada a Mercado Pago.
   */
  private urlBasePublica(
    candidatas: Array<[nombre: string, valor: string | undefined]>,
    defecto: string,
  ): string {
    for (const [nombre, valor] of candidatas) {
      const primerValor = (valor ?? '').split(',')[0].trim();
      if (!primerValor) {
        continue;
      }
      if (this.esUrlHttpValida(primerValor)) {
        return primerValor;
      }
      this.logger.warn(
        `La URL de ${nombre} ("${primerValor}") no es una URL http(s) válida: se ignora.`,
      );
    }
    return defecto;
  }

  /** true si la cadena es una URL http(s) parseable. */
  private esUrlHttpValida(valor: string): boolean {
    try {
      const url = new URL(valor);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /** true si la URL apunta a localhost / 127.0.0.1. */
  private esHostLocal(url: string): boolean {
    try {
      const host = new URL(url).hostname;
      return host === 'localhost' || host === '127.0.0.1';
    } catch {
      return false;
    }
  }

  /** Quita barras finales para no generar URLs con `//` al concatenar. */
  private normalizarUrl(url: string): string {
    return url.replace(/\/+$/, '');
  }

  /**
   * Estado de la suscripción del veterinario autenticado.
   *
   * Crea el registro en PENDIENTE_PAGO si todavía no existe, para que la
   * pantalla siempre tenga algo que mostrar.
   *
   * Si el estado es PENDIENTE_PAGO y hay un preapproval en MP, hace una
   * pull-verification contra la API de MP: sana webhooks perdidos sin activar
   * nada que MP no haya aprobado (una llamada a la API por visita).
   */
  async obtenerMia(idUsuario: number): Promise<SuscripcionResponseDto> {
    const suscripcion = await this.buscarPorUsuario(idUsuario);
    await this.reconciliarPreapproval(suscripcion);
    return SuscripcionResponseDto.fromEntity(
      suscripcion,
      this.evaluarAccesoDe(suscripcion),
    );
  }

  /**
   * Crea el preapproval en Mercado Pago y devuelve el init_point para que el
   * frontend redirija al checkout (primera cuota + renovaciones automáticas).
   */
  async suscribirme(
    idUsuario: number,
  ): Promise<{ initPoint: string; suscripcion: SuscripcionResponseDto }> {
    const veterinario = await this.veterinariosRepository.findOne({
      where: { usuario: { idUsuario } },
      relations: ['usuario'],
    });

    if (
      !veterinario ||
      veterinario.estadoValidacion !== ValidationStatus.APROBADO
    ) {
      throw new ForbiddenException({
        codigoEstado: 403,
        mensaje: 'Su cuenta de veterinario no está validada',
      });
    }

    const suscripcion = await this.buscarPorUsuario(idUsuario);

    if (suscripcion.estado === SuscripcionEstado.ACTIVA) {
      throw new ConflictException({
        codigoEstado: 409,
        mensaje: 'La suscripción ya está activa',
      });
    }

    const email = veterinario.usuario?.email;
    if (!email) {
      throw new ConflictException({
        codigoEstado: 409,
        mensaje: 'No se encontró el email del veterinario',
      });
    }

    const body = {
      reason: 'Suscripción PetCare',
      back_url: this.backUrl,
      notification_url: this.webhookUrl,
      external_reference: String(suscripcion.idSuscripcion),
      payer_email: process.env.MP_PAYER_EMAIL?.trim() || email,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: this.monto,
        currency_id: this.moneda,
      },
    };

    try {
      this.logger.log(`BACK_URL: ${body.back_url}`);
      this.logger.log(`WEBHOOK_URL: ${body.notification_url}`);
      const preapproval = await this.preApproval.create({ body });

      suscripcion.mpPreapprovalId = preapproval.id ?? null;
      suscripcion.monto = this.monto;
      suscripcion.moneda = this.moneda;
      suscripcion.estado = SuscripcionEstado.PENDIENTE_PAGO;
      await this.suscripcionesRepository.save(suscripcion);

      return {
        initPoint: preapproval.init_point ?? '',
        suscripcion: SuscripcionResponseDto.fromEntity(
          suscripcion,
          this.evaluarAccesoDe(suscripcion),
        ),
      };
    } catch (error) {
      this.logger.error(
        `No se pudo crear el preapproval para el usuario ${idUsuario}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new ConflictException({
        codigoEstado: 409,
        mensaje:
          'No se pudo iniciar el pago con Mercado Pago. Intentá de nuevo.',
      });
    }
  }

  /** Historial de pagos de la suscripción del veterinario. */
  async historial(idUsuario: number): Promise<PagoResponseDto[]> {
    const suscripcion = await this.buscarPorUsuario(idUsuario);
    const pagos = await this.pagosRepository.find({
      where: { suscripcion: { idSuscripcion: suscripcion.idSuscripcion } },
      order: { createdAt: 'DESC' },
      relations: ['suscripcion'],
    });
    return pagos.map((pago) => PagoResponseDto.fromEntity(pago));
  }

  /** Listado para el panel de administración. */
  async listarAdmin(): Promise<SuscripcionResponseDto[]> {
    const suscripciones = await this.suscripcionesRepository.find({
      relations: ['usuario'],
      order: { updatedAt: 'DESC' },
    });
    return suscripciones.map((s) =>
      SuscripcionResponseDto.fromEntity(s, this.evaluarAccesoDe(s)),
    );
  }

  /** Detalle de una suscripción con su historial de pagos (admin). */
  async detalleAdmin(idSuscripcion: number): Promise<{
    suscripcion: SuscripcionResponseDto;
    pagos: PagoResponseDto[];
  }> {
    const suscripcion = await this.suscripcionesRepository.findOne({
      where: { idSuscripcion },
      relations: ['usuario'],
    });

    if (!suscripcion) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'No se encontró la suscripción',
      });
    }

    const pagos = await this.pagosRepository.find({
      where: { suscripcion: { idSuscripcion } },
      order: { createdAt: 'DESC' },
      relations: ['suscripcion'],
    });

    return {
      suscripcion: SuscripcionResponseDto.fromEntity(
        suscripcion,
        this.evaluarAccesoDe(suscripcion),
      ),
      pagos: pagos.map((pago) => PagoResponseDto.fromEntity(pago)),
    };
  }

  /**
   * Webhook de Mercado Pago (pagos, renovaciones, fallos).
   *
   * Valida la firma, idempotencia mediante mp_payment_id, y actualiza la
   * suscripción según el evento. Siempre responde OK ante eventos conocidos
   * para que MP no reintente en loop.
   */
  async manejarWebhook(
    headers: Record<string, string | string[] | undefined>,
    query: Record<string, unknown>,
    body: Record<string, unknown>,
  ): Promise<{ ok: true }> {
    const xSignature = headers['x-signature'];
    const xRequestId = headers['x-request-id'];
    const dataId = this.extraerDataId(query, body);
    const tipo = this.extraerTipo(query, body);

    const secret = process.env.MP_WEBHOOK_SECRET;
    if (secret) {
      try {
        WebhookSignatureValidator.validate({
          xSignature,
          xRequestId,
          dataId,
          secret,
        });
      } catch {
        throw new UnauthorizedException({
          codigoEstado: 401,
          mensaje: 'Firma del webhook inválida',
        });
      }
    } else {
      this.logger.warn(
        'MP_WEBHOOK_SECRET no está configurado: el webhook se procesa sin validar la firma',
      );
    }

    if (!dataId) {
      // MP manda notificaciones de otros tipos sin data.id: se ackcean igual.
      return { ok: true };
    }

    if (tipo === 'payment') {
      await this.procesarPayment(dataId);
    } else if (tipo === 'preapproval') {
      await this.procesarPreapproval(dataId);
    }

    return { ok: true };
  }

  /**
   * Cron horario: detecta suscripciones ACTIVAS cuyo período terminó y las
   * pasa a VENCIDA iniciando la gracia; suspende las que se pasaron de la
   * gracia; avisa cuando la gracia está por vencer.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async revisarVencimientos(): Promise<void> {
    const ahora = new Date();
    const vencidas = await this.suscripcionesRepository.find({
      where: { estado: SuscripcionEstado.ACTIVA },
      relations: ['usuario'],
    });

    for (const suscripcion of vencidas) {
      if (suscripcion.fechaFin && suscripcion.fechaFin > ahora) {
        continue;
      }
      await this.vencer(suscripcion, ahora);
    }

    await this.suspenderPorGraciaExpirada(ahora);
    await this.notificarGraciaPorVencer(ahora);
  }

  /**
   * Única fuente de verdad del acceso a la plataforma para un usuario.
   *
   * Chequea primero la cuenta (veterinario con validación APROBADA) y
   * después la suscripción. La usa el AccesoPlataformaInterceptor en cada
   * request de un veterinario y la pantalla de "Mi suscripción".
   *
   * No crea la suscripción si no existe: es una lectura, no una escritura.
   */
  async evaluarAcceso(idUsuario: number): Promise<AccesoPlataforma> {
    const veterinario = await this.veterinariosRepository.findOne({
      where: { usuario: { idUsuario } },
    });
    if (
      !veterinario ||
      veterinario.estadoValidacion !== ValidationStatus.APROBADO
    ) {
      return {
        accesoPermitido: false,
        codigo: 'CUENTA_NO_APROBADA',
        motivo:
          'Tu cuenta de veterinario todavía no fue aprobada por un administrador.',
      };
    }

    const suscripcion = await this.suscripcionesRepository.findOne({
      where: { usuario: { idUsuario } },
    });
    return this.evaluarAccesoDe(suscripcion);
  }

  /**
   * Evalúa el acceso según el estado de la suscripción:
   *
   * - ACTIVA: acceso.
   * - VENCIDA todavía dentro de la gracia: acceso.
   * - VENCIDA fuera de la gracia, SUSPENDIDA, CANCELADA o PENDIENTE_PAGO:
   *   sin acceso, hay que pagar.
   */
  evaluarAccesoDe(suscripcion: Suscripcion | null): AccesoPlataforma {
    if (!suscripcion) {
      return {
        accesoPermitido: false,
        codigo: 'SUSCRIPCION_PENDIENTE',
        motivo:
          'Necesitás una suscripción activa para usar la plataforma. Suscribite desde "Mi suscripción".',
      };
    }

    if (suscripcion.estado === SuscripcionEstado.ACTIVA) {
      return { accesoPermitido: true, codigo: null, motivo: null };
    }

    if (suscripcion.estado === SuscripcionEstado.VENCIDA) {
      if (this.dentroDeGracia(suscripcion)) {
        return { accesoPermitido: true, codigo: null, motivo: null };
      }
      return {
        accesoPermitido: false,
        codigo: 'SUSCRIPCION_VENCIDA',
        motivo:
          'Tu suscripción venció y terminó el período de gracia. Regularizá tu pago para volver a tener acceso.',
      };
    }

    if (suscripcion.estado === SuscripcionEstado.SUSPENDIDA) {
      return {
        accesoPermitido: false,
        codigo: 'SUSCRIPCION_SUSPENDIDA',
        motivo:
          'Tu suscripción fue suspendida. Regularizá tu pago para volver a tener acceso.',
      };
    }

    if (suscripcion.estado === SuscripcionEstado.CANCELADA) {
      return {
        accesoPermitido: false,
        codigo: 'SUSCRIPCION_CANCELADA',
        motivo:
          'Tu suscripción fue cancelada. Suscribite de nuevo para continuar.',
      };
    }

    return {
      accesoPermitido: false,
      codigo: 'SUSCRIPCION_PENDIENTE',
      motivo:
        'Tu suscripción está pendiente de pago. Completá el pago desde "Mi suscripción" para usar la plataforma.',
    };
  }

  /** True si la suscripción está VENCIDA pero todavía dentro de la gracia. */
  private dentroDeGracia(suscripcion: Suscripcion): boolean {
    if (!suscripcion.fechaGraciaInicio) {
      return false;
    }
    const finGracia =
      new Date(suscripcion.fechaGraciaInicio).getTime() +
      this.diasGracia * DIA_EN_MS;
    return Date.now() < finGracia;
  }

  private async buscarPorUsuario(idUsuario: number): Promise<Suscripcion> {
    const existente = await this.suscripcionesRepository.findOne({
      where: { usuario: { idUsuario } },
      relations: ['usuario'],
    });
    if (existente) {
      return existente;
    }

    const creada = this.suscripcionesRepository.create({
      usuario: { idUsuario } as User,
      estado: SuscripcionEstado.PENDIENTE_PAGO,
      monto: this.monto,
      moneda: this.moneda,
    });
    return this.suscripcionesRepository.save(creada);
  }

  private async procesarPayment(paymentId: string): Promise<void> {
    let payment: Awaited<ReturnType<Payment['get']>>;
    try {
      payment = await this.payment.get({ id: paymentId });
    } catch (error) {
      this.logger.warn(
        `No se pudo obtener el payment ${paymentId} de MP`,
        error instanceof Error ? error.message : undefined,
      );
      return;
    }

    // Idempotencia: si ya registramos este pago, no se procesa de nuevo.
    const yaProcesado = await this.pagosRepository.findOne({
      where: { mpPaymentId: paymentId },
    });
    if (yaProcesado) {
      return;
    }

    const suscripcion = await this.buscarPorPayment(payment);
    if (!suscripcion) {
      this.logger.warn(
        `El payment ${paymentId} no tiene suscripción asociada (external_reference=${payment.external_reference})`,
      );
      return;
    }

    const estadoPago =
      PAGO_POR_ESTADO_MP[payment.status ?? 'pending'] ?? 'pendiente';

    await this.registrarPago(suscripcion, {
      mpPaymentId: paymentId,
      mpStatus: payment.status ?? null,
      estado: estadoPago,
      monto: Number(payment.transaction_amount ?? suscripcion.monto),
      moneda: payment.currency_id ?? suscripcion.moneda,
      fechaPago:
        payment.date_approved != null ? new Date(payment.date_approved) : null,
    });

    if (estadoPago === 'aprobado') {
      await this.activarORenovar(suscripcion);
    } else if (estadoPago === 'rechazado' || estadoPago === 'cancelado') {
      await this.pagoFallido(suscripcion);
    }
  }

  private async procesarPreapproval(preapprovalId: string): Promise<void> {
    let preapproval: Awaited<ReturnType<PreApproval['get']>>;
    try {
      preapproval = await this.preApproval.get({ id: preapprovalId });
    } catch (error) {
      this.logger.warn(
        `No se pudo obtener el preapproval ${preapprovalId} de MP`,
        error instanceof Error ? error.message : undefined,
      );
      return;
    }

    const suscripcion = await this.suscripcionesRepository.findOne({
      where: { mpPreapprovalId: preapprovalId },
      relations: ['usuario'],
    });
    if (!suscripcion) {
      this.logger.warn(
        `No hay suscripción para el preapproval ${preapprovalId}`,
      );
      return;
    }

    switch (preapproval.status) {
      case 'authorized':
        if (suscripcion.estado !== SuscripcionEstado.ACTIVA) {
          await this.activarORenovar(suscripcion);
        }
        break;
      case 'paused':
        await this.pagoFallido(suscripcion);
        break;
      case 'cancelled':
        // Nunca activada (fecha_inicio nula): MP cancela el preapproval
        // cuando el primer pago fue rechazado. Se mantiene PENDIENTE_PAGO
        // para que el veterinario pueda reintentar con un preapproval nuevo.
        if (suscripcion.fechaInicio == null) {
          this.logger.log(
            `Preapproval ${preapprovalId} cancelled con suscripción nunca activada: se mantiene PENDIENTE_PAGO`,
          );
          break;
        }
        suscripcion.estado = SuscripcionEstado.CANCELADA;
        suscripcion.fechaGraciaInicio = null;
        await this.suscripcionesRepository.save(suscripcion);
        break;
      default:
        // pending u otros estados intermedios: no cambia nada todavía.
        break;
    }
  }

  /**
   * Pull-verification: consulta el estado real del preapproval en MP cuando
   * la suscripción local está PENDIENTE_PAGO, para sanear webhooks perdidos
   * (p. ej. corriendo local sin túnel). Nunca activa sin confirmación de MP:
   * reutiliza la misma lógica que procesarPreapproval.
   */
  private async reconciliarPreapproval(
    suscripcion: Suscripcion,
  ): Promise<void> {
    if (
      suscripcion.estado !== SuscripcionEstado.PENDIENTE_PAGO ||
      !suscripcion.mpPreapprovalId
    ) {
      return;
    }

    let preapproval: Awaited<ReturnType<PreApproval['get']>>;
    try {
      preapproval = await this.preApproval.get({
        id: suscripcion.mpPreapprovalId,
      });
    } catch (error) {
      this.logger.warn(
        `No se pudo verificar el preapproval ${suscripcion.mpPreapprovalId} de MP`,
        error instanceof Error ? error.message : undefined,
      );
      return;
    }

    switch (preapproval.status) {
      case 'authorized':
        await this.activarORenovar(suscripcion);
        break;
      case 'cancelled':
        // Misma regla que procesarPreapproval: sin activación previa
        // (fecha_inicio nula) el cancelled es un primer pago rechazado,
        // no una cancelación real, y se conserva PENDIENTE_PAGO.
        if (suscripcion.fechaInicio == null) {
          this.logger.log(
            `Preapproval ${suscripcion.mpPreapprovalId} cancelled con suscripción nunca activada: se mantiene PENDIENTE_PAGO`,
          );
          break;
        }
        suscripcion.estado = SuscripcionEstado.CANCELADA;
        suscripcion.fechaGraciaInicio = null;
        await this.suscripcionesRepository.save(suscripcion);
        break;
      default:
        break;
    }
  }

  private async buscarPorPayment(
    payment: Awaited<ReturnType<Payment['get']>>,
  ): Promise<Suscripcion | null> {
    if (payment.external_reference) {
      const porReference = await this.suscripcionesRepository.findOne({
        where: { idSuscripcion: Number(payment.external_reference) },
        relations: ['usuario'],
      });
      if (porReference) {
        return porReference;
      }
    }

    const mpPreapprovalId = (payment as { preapproval_id?: string | null })
      .preapproval_id;
    if (mpPreapprovalId) {
      return this.suscripcionesRepository.findOne({
        where: { mpPreapprovalId },
        relations: ['usuario'],
      });
    }

    return null;
  }

  private async registrarPago(
    suscripcion: Suscripcion,
    datos: {
      mpPaymentId: string;
      mpStatus: string | null;
      estado: 'pendiente' | 'aprobado' | 'rechazado' | 'cancelado';
      monto: number;
      moneda: string;
      fechaPago: Date | null;
    },
  ): Promise<void> {
    const pago = this.pagosRepository.create({
      suscripcion,
      mpPaymentId: datos.mpPaymentId,
      mpStatus: datos.mpStatus,
      estado: datos.estado,
      monto: datos.monto,
      moneda: datos.moneda,
      fechaPago: datos.fechaPago,
    });
    await this.pagosRepository.save(pago);
  }

  /**
   * Activa la suscripción por 30 días.
   *
   * Si ya estaba activa (renovación), el período nuevo arranca desde el fin
   * del actual para no perder días; si estaba vencida, desde ahora.
   */
  private async activarORenovar(suscripcion: Suscripcion): Promise<void> {
    const eraActiva = suscripcion.estado === SuscripcionEstado.ACTIVA;
    const ahora = new Date();

    const base =
      eraActiva && suscripcion.fechaFin && suscripcion.fechaFin > ahora
        ? suscripcion.fechaFin
        : ahora;
    const fin = new Date(base.getTime() + DIAS_PERIODOS * DIA_EN_MS);

    suscripcion.estado = SuscripcionEstado.ACTIVA;
    suscripcion.fechaInicio = eraActiva ? suscripcion.fechaInicio : base;
    suscripcion.fechaFin = fin;
    suscripcion.fechaVencimiento = fin;
    suscripcion.fechaGraciaInicio = null;
    suscripcion.graciaNotificada = false;
    await this.suscripcionesRepository.save(suscripcion);

    const idUsuario = suscripcion.usuario?.idUsuario;
    if (idUsuario) {
      await this.notificacionesService.crear(
        idUsuario,
        NotificationType.SUSCRIPCION_RENOVADA,
        eraActiva ? 'Suscripción renovada' : 'Suscripción activada',
        eraActiva
          ? 'Tu suscripción fue renovada exitosamente.'
          : 'Tu suscripción quedó activada. Ya podés usar la plataforma.',
      );
    }
  }

  /** Pasa la suscripción a VENCIDA, inicia la gracia y notifica (una sola vez). */
  private async vencer(suscripcion: Suscripcion, ahora: Date): Promise<void> {
    if (suscripcion.estado === SuscripcionEstado.VENCIDA) {
      return;
    }

    suscripcion.estado = SuscripcionEstado.VENCIDA;
    suscripcion.fechaGraciaInicio = ahora;
    suscripcion.graciaNotificada = false;
    await this.suscripcionesRepository.save(suscripcion);

    const idUsuario = suscripcion.usuario?.idUsuario;
    if (idUsuario) {
      await this.notificacionesService.crear(
        idUsuario,
        NotificationType.SUSCRIPCION_VENCIDA,
        'Suscripción vencida',
        `Tu suscripción venció. Tenés ${this.diasGracia} días de gracia para pagar.`,
      );
    }
  }

  /**
   * Un pago fallido (rechazado/cancelado) o un preapproval pausado.
   *
   * Solo inicia la gracia si la suscripción estaba ACTIVA (fallo de una
   * renovación). El primer pago rechazado queda en PENDIENTE_PAGO, sin gracia
   * y sin acceso: la gracia es exclusivamente para renovaciones fallidas.
   */
  private async pagoFallido(suscripcion: Suscripcion): Promise<void> {
    if (suscripcion.estado !== SuscripcionEstado.ACTIVA) {
      return;
    }
    await this.vencer(suscripcion, new Date());
  }

  /** Avisa una sola vez que la gracia termina mañana. */
  private async notificarGraciaPorVencer(ahora: Date): Promise<void> {
    const enGracia = await this.suscripcionesRepository.find({
      where: {
        estado: SuscripcionEstado.VENCIDA,
        graciaNotificada: false,
      },
      relations: ['usuario'],
    });

    for (const suscripcion of enGracia) {
      if (!suscripcion.fechaGraciaInicio) {
        continue;
      }
      const finGracia =
        new Date(suscripcion.fechaGraciaInicio).getTime() +
        this.diasGracia * DIA_EN_MS;
      // Queda ~1 día de gracia (entre 0 y 24 h para el fin).
      const unDiaAntes = finGracia - DIA_EN_MS;
      if (ahora.getTime() < unDiaAntes) {
        continue;
      }

      suscripcion.graciaNotificada = true;
      await this.suscripcionesRepository.save(suscripcion);

      const idUsuario = suscripcion.usuario?.idUsuario;
      if (idUsuario) {
        await this.notificacionesService.crear(
          idUsuario,
          NotificationType.SUSCRIPCION_GRACIA_POR_VENCER,
          'Período de gracia por vencer',
          'Tu período de gracia termina mañana. Regularizá tu pago para no perder el acceso.',
        );
      }
    }
  }

  /**
   * Pasa a SUSPENDIDA las suscripciones VENCidas cuya gracia ya expiró y
   * avisa una sola vez (la transición VENCIDA → SUSPENDIDA pasa una vez por
   * ciclo, así que no hace falta un flag extra).
   *
   * Mientras corre el cron (1 vez por hora) el acceso ya está bloqueado:
   * evaluarAccesoDe chequea la fecha de gracia, no solo el estado.
   */
  private async suspenderPorGraciaExpirada(ahora: Date): Promise<void> {
    const vencidas = await this.suscripcionesRepository.find({
      where: { estado: SuscripcionEstado.VENCIDA },
      relations: ['usuario'],
    });

    for (const suscripcion of vencidas) {
      if (!suscripcion.fechaGraciaInicio) {
        continue;
      }
      const finGracia =
        new Date(suscripcion.fechaGraciaInicio).getTime() +
        this.diasGracia * DIA_EN_MS;
      if (ahora.getTime() < finGracia) {
        continue;
      }

      suscripcion.estado = SuscripcionEstado.SUSPENDIDA;
      await this.suscripcionesRepository.save(suscripcion);

      const idUsuario = suscripcion.usuario?.idUsuario;
      if (idUsuario) {
        await this.notificacionesService.crear(
          idUsuario,
          NotificationType.SUSCRIPCION_SUSPENDIDA,
          'Suscripción suspendida',
          'Tu suscripción fue suspendida porque venció el período de gracia. Regularizá tu pago para volver a tener acceso.',
        );
      }
    }
  }

  private extraerDataId(
    query: Record<string, unknown>,
    body: Record<string, unknown>,
  ): string | undefined {
    const candidatos = [
      query['data.id'],
      query.id,
      typeof body.data === 'object' && body.data !== null
        ? (body.data as Record<string, unknown>).id
        : undefined,
      body['data.id'],
      typeof body.data === 'string' ? body.data : undefined,
    ];
    for (const candidato of candidatos) {
      const texto = this.stringifyValor(candidato);
      if (texto !== undefined) {
        return texto;
      }
    }
    return undefined;
  }

  private extraerTipo(
    query: Record<string, unknown>,
    body: Record<string, unknown>,
  ): string | undefined {
    return this.stringifyValor(body.type ?? query.type);
  }

  private stringifyValor(valor: unknown): string | undefined {
    if (valor === undefined || valor === null || valor === '') {
      return undefined;
    }
    if (typeof valor === 'string') {
      return valor;
    }
    if (
      typeof valor === 'number' ||
      typeof valor === 'boolean' ||
      typeof valor === 'bigint'
    ) {
      return String(valor);
    }
    return JSON.stringify(valor);
  }
}
