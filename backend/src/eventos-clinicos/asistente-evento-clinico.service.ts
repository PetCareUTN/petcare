import {
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { ClinicalEventType } from '../common/enums/clinical-event-type.enum';
import { TipoVacuna } from '../common/enums/tipo-vacuna.enum';
import { SugerenciaEventoClinicoDto } from './dto/asistente-evento-clinico.dto';

const MODELO_POR_DEFECTO = 'claude-opus-5-5';

// Modelos que aceptan `effort` y el reintento automático con otro modelo si
// el primero se niega a responder. Con cualquier otro (por ejemplo Haiku, si
// se cambia ANTHROPIC_MODEL para gastar menos) se manda el pedido básico.
const MODELOS_ACTUALES = new Set([
  'claude-opus-5-5',
  'claude-sonnet-5-5',
  'claude-fable-5-1',
]);

const INSTRUCCIONES = `Sos el asistente de una veterinaria que dicta en voz alta lo que pasó en una consulta. Tu tarea es ordenar ese dictado en los campos del formulario de evento clínico de la historia clínica de la mascota.

Campos:
- tipo: el tipo de evento que mejor describe la atención. Si dudás, usá "consulta".
- descripcion: qué pasó en la atención (motivo de consulta, anamnesis, examen). Es el campo principal: siempre tiene que tener contenido.
- diagnostico: el diagnóstico o presunción diagnóstica, si se mencionó.
- tratamiento: medicación, dosis, frecuencia, duración e indicaciones, si se mencionaron.
- observaciones: controles, próximos pasos u otras notas que no entren en los campos anteriores.
- vacuna: solo si se aplicó una de las vacunas de la lista; si no, "".

Reglas:
- Usá únicamente lo que dice el dictado. No inventes datos, dosis ni diagnósticos, y no agregues recomendaciones propias.
- Corregí errores evidentes del reconocimiento de voz (por ejemplo, nombres de medicamentos mal transcriptos) solo cuando el término correcto sea obvio.
- Redactá en español rioplatense, en tono clínico, conciso, en texto plano (sin markdown). Podés separar ideas en líneas distintas.
- Si un campo no se menciona, devolvé "" en ese campo.`;

// Todos los campos son obligatorios y "" significa "no se mencionó": así el
// esquema queda simple y la respuesta siempre tiene la misma forma.
const ESQUEMA_RESPUESTA = {
  type: 'object',
  properties: {
    tipo: { type: 'string', enum: Object.values(ClinicalEventType) },
    descripcion: { type: 'string' },
    diagnostico: { type: 'string' },
    tratamiento: { type: 'string' },
    observaciones: { type: 'string' },
    vacuna: { type: 'string', enum: [...Object.values(TipoVacuna), ''] },
  },
  required: [
    'tipo',
    'descripcion',
    'diagnostico',
    'tratamiento',
    'observaciones',
    'vacuna',
  ],
  additionalProperties: false,
};

interface RespuestaModelo {
  tipo: ClinicalEventType;
  descripcion: string;
  diagnostico: string;
  tratamiento: string;
  observaciones: string;
  vacuna: TipoVacuna | '';
}

@Injectable()
export class AsistenteEventoClinicoService {
  private readonly logger = new Logger(AsistenteEventoClinicoService.name);

  /**
   * Ordena en campos una consulta dictada por voz (P1-182).
   *
   * No guarda nada: devuelve una sugerencia que la veterinaria revisa en el
   * formulario. Si la IA no está disponible (sin API key, sin crédito, error
   * de red o respuesta inválida) lanza 503 y el formulario sigue funcionando
   * con carga manual.
   */
  async sugerirCampos(
    transcripcion: string,
  ): Promise<SugerenciaEventoClinicoDto> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      this.logger.warn(
        'ANTHROPIC_API_KEY no configurada; el asistente de voz no está disponible.',
      );
      throw this.noDisponible();
    }

    const modelo = process.env.ANTHROPIC_MODEL || MODELO_POR_DEFECTO;
    const esModeloActual = MODELOS_ACTUALES.has(modelo);
    const client = new Anthropic({ apiKey, timeout: 60_000, maxRetries: 1 });

    let texto: string | undefined;
    try {
      const response = await client.beta.messages.create({
        model: modelo,
        max_tokens: 8000,
        system: INSTRUCCIONES,
        messages: [
          {
            role: 'user',
            content: `<dictado>\n${transcripcion}\n</dictado>`,
          },
        ],
        output_config: {
          format: { type: 'json_schema', schema: ESQUEMA_RESPUESTA },
          // Ordenar un dictado no requiere razonar mucho: menos espera y menos costo.
          ...(esModeloActual ? { effort: 'low' as const } : {}),
        },
        ...(esModeloActual
          ? {
              betas: ['server-side-fallback-2026-07-01'],
              fallbacks: 'default' as const,
            }
          : {}),
      });

      if (response.stop_reason !== 'end_turn') {
        this.logger.warn(
          `El asistente terminó con stop_reason "${response.stop_reason}"`,
        );
        throw this.noDisponible();
      }
      texto = response.content.find((block) => block.type === 'text')?.text;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      if (error instanceof Anthropic.APIError) {
        this.logger.error(
          `Error de la API de Anthropic (HTTP ${error.status}): ${error.message}`,
        );
      } else {
        this.logger.error(
          'Error inesperado al consultar el asistente',
          error as Error,
        );
      }
      throw this.noDisponible();
    }

    if (!texto) throw this.noDisponible();

    let respuesta: RespuestaModelo;
    try {
      respuesta = JSON.parse(texto) as RespuestaModelo;
    } catch {
      this.logger.warn('El asistente devolvió un JSON inválido');
      throw this.noDisponible();
    }

    return {
      tipo: respuesta.tipo || null,
      descripcion: respuesta.descripcion.trim() || null,
      diagnostico: respuesta.diagnostico.trim() || null,
      tratamiento: respuesta.tratamiento.trim() || null,
      observaciones: respuesta.observaciones.trim() || null,
      vacuna: respuesta.vacuna || null,
    };
  }

  private noDisponible(): ServiceUnavailableException {
    return new ServiceUnavailableException({
      codigoEstado: HttpStatus.SERVICE_UNAVAILABLE,
      mensaje:
        'El asistente no está disponible en este momento. Podés completar el formulario manualmente',
    });
  }
}
