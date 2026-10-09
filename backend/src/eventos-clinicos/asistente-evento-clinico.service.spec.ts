import { ServiceUnavailableException } from '@nestjs/common';
import { AsistenteEventoClinicoService } from './asistente-evento-clinico.service';

const mockCreate = jest.fn();

jest.mock('@anthropic-ai/sdk', () => {
  class APIError extends Error {
    constructor(readonly status: number) {
      super(`HTTP ${status}`);
    }
  }
  class Anthropic {
    static APIError = APIError;
    beta = { messages: { create: mockCreate } };
  }
  return { __esModule: true, default: Anthropic };
});

function respuestaConTexto(texto: string, stopReason = 'end_turn') {
  return {
    stop_reason: stopReason,
    content: [{ type: 'text', text: texto }],
  };
}

describe('AsistenteEventoClinicoService', () => {
  let service: AsistenteEventoClinicoService;
  const apiKeyOriginal = process.env.ANTHROPIC_API_KEY;
  const modeloOriginal = process.env.ANTHROPIC_MODEL;

  beforeEach(() => {
    mockCreate.mockReset();
    process.env.ANTHROPIC_API_KEY = 'clave-de-prueba';
    delete process.env.ANTHROPIC_MODEL;
    service = new AsistenteEventoClinicoService();
  });

  afterAll(() => {
    process.env.ANTHROPIC_API_KEY = apiKeyOriginal;
    process.env.ANTHROPIC_MODEL = modeloOriginal;
  });

  it('devuelve los campos sugeridos y convierte los vacíos en null', async () => {
    mockCreate.mockResolvedValue(
      respuestaConTexto(
        JSON.stringify({
          tipo: 'consulta',
          descripcion: 'Prurito en oído derecho de una semana.',
          diagnostico: 'Otitis externa.',
          tratamiento: '  ',
          observaciones: '',
          vacuna: '',
        }),
      ),
    );

    await expect(service.sugerirCampos('vino por la oreja')).resolves.toEqual({
      tipo: 'consulta',
      descripcion: 'Prurito en oído derecho de una semana.',
      diagnostico: 'Otitis externa.',
      tratamiento: null,
      observaciones: null,
      vacuna: null,
    });
  });

  it('manda la transcripción y pide la respuesta con el esquema del formulario', async () => {
    mockCreate.mockResolvedValue(
      respuestaConTexto(
        JSON.stringify({
          tipo: 'vacuna',
          descripcion: 'Aplicación de antirrábica.',
          diagnostico: '',
          tratamiento: '',
          observaciones: '',
          vacuna: 'antirrabica',
        }),
      ),
    );

    await service.sugerirCampos('le puse la antirrábica');

    const [request] = mockCreate.mock.calls[0] as [
      {
        model: string;
        messages: Array<{ content: string }>;
        output_config: { format: { type: string } };
      },
    ];
    expect(request.model).toBe('claude-opus-5-5');
    expect(request.messages[0].content).toContain('le puse la antirrábica');
    expect(request.output_config.format.type).toBe('json_schema');
  });

  it('con otro modelo configurado no manda opciones exclusivas de los modelos actuales', async () => {
    process.env.ANTHROPIC_MODEL = 'claude-haiku-4-5';
    mockCreate.mockResolvedValue(
      respuestaConTexto(
        JSON.stringify({
          tipo: 'control',
          descripcion: 'Control post quirúrgico.',
          diagnostico: '',
          tratamiento: '',
          observaciones: '',
          vacuna: '',
        }),
      ),
    );

    await service.sugerirCampos('control de la cirugía');

    const [request] = mockCreate.mock.calls[0] as [
      Record<string, unknown> & { output_config: Record<string, unknown> },
    ];
    expect(request.model).toBe('claude-haiku-4-5');
    expect(request).not.toHaveProperty('fallbacks');
    expect(request.output_config).not.toHaveProperty('effort');
  });

  it('sin API key responde 503 sin llamar a la IA', async () => {
    delete process.env.ANTHROPIC_API_KEY;

    await expect(service.sugerirCampos('algo')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('si la API de Anthropic falla responde 503', async () => {
    const { default: Anthropic } = jest.requireMock<{
      default: { APIError: new (status: number) => Error };
    }>('@anthropic-ai/sdk');
    mockCreate.mockRejectedValue(new Anthropic.APIError(401));

    await expect(service.sugerirCampos('algo')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('si la IA no termina normalmente responde 503', async () => {
    mockCreate.mockResolvedValue(respuestaConTexto('', 'refusal'));

    await expect(service.sugerirCampos('algo')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('si la IA devuelve un JSON inválido responde 503', async () => {
    mockCreate.mockResolvedValue(respuestaConTexto('no es json'));

    await expect(service.sugerirCampos('algo')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
