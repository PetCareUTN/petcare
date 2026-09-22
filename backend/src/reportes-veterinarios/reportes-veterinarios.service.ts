import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { AppointmentStatus } from '../common/enums/appointment-status.enum';
import { DiaSemana } from '../common/enums/dia-semana.enum';
import { ValidationStatus } from '../common/enums/validation-status.enum';
import { DisponibilidadVeterinaria } from '../disponibilidades-veterinarias/entities/disponibilidad-veterinaria.entity';
import { TurnoVeterinario } from '../turnos-veterinarios/entities/turno-veterinario.entity';
import { Veterinario } from '../veterinarios/entities/veterinario.entity';
import {
  HorarioPicoDto,
  OcupacionPorDiaDto,
  PacientesPorMesDto,
  ReporteDashboardVeterinarioDto,
  TurnosPorMesDto,
} from './dto/reporte-dashboard-veterinario.dto';

const DURACION_TURNO_MINUTOS = 30;
const MESES_CORTOS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];
const DIAS_POR_INDICE: DiaSemana[] = [
  DiaSemana.DOMINGO,
  DiaSemana.LUNES,
  DiaSemana.MARTES,
  DiaSemana.MIERCOLES,
  DiaSemana.JUEVES,
  DiaSemana.VIERNES,
  DiaSemana.SABADO,
];
const DIAS_ORDENADOS: DiaSemana[] = [
  DiaSemana.LUNES,
  DiaSemana.MARTES,
  DiaSemana.MIERCOLES,
  DiaSemana.JUEVES,
  DiaSemana.VIERNES,
  DiaSemana.SABADO,
  DiaSemana.DOMINGO,
];
const ETIQUETAS_DIA: Record<DiaSemana, string> = {
  [DiaSemana.LUNES]: 'Lunes',
  [DiaSemana.MARTES]: 'Martes',
  [DiaSemana.MIERCOLES]: 'Miércoles',
  [DiaSemana.JUEVES]: 'Jueves',
  [DiaSemana.VIERNES]: 'Viernes',
  [DiaSemana.SABADO]: 'Sábado',
  [DiaSemana.DOMINGO]: 'Domingo',
};

@Injectable()
export class ReportesVeterinariosService {
  constructor(
    @InjectRepository(TurnoVeterinario)
    private readonly turnosRepository: Repository<TurnoVeterinario>,
    @InjectRepository(DisponibilidadVeterinaria)
    private readonly disponibilidadesRepository: Repository<DisponibilidadVeterinaria>,
    @InjectRepository(Veterinario)
    private readonly veterinariosRepository: Repository<Veterinario>,
  ) {}

  async obtenerDashboard(
    idUsuario: number,
    desde?: string,
    hasta?: string,
  ): Promise<ReporteDashboardVeterinarioDto> {
    const veterinario = await this.findVeterinarioValidado(idUsuario);
    const { rangoDesde, rangoHasta } = this.resolverRango(desde, hasta);

    const [turnosEnRango, disponibilidades, todosConfirmados] = await Promise.all([
      this.turnosRepository.find({
        where: {
          veterinario: { idVeterinario: veterinario.idVeterinario },
          fecha: Between(rangoDesde, rangoHasta),
        },
        relations: ['mascota'],
      }),
      this.disponibilidadesRepository.find({
        where: { veterinario: { idVeterinario: veterinario.idVeterinario } },
      }),
      this.turnosRepository.find({
        where: {
          veterinario: { idVeterinario: veterinario.idVeterinario },
          estado: AppointmentStatus.CONFIRMADO,
        },
        relations: ['mascota'],
      }),
    ]);

    const confirmadosEnRango = turnosEnRango.filter(
      (turno) => turno.estado === AppointmentStatus.CONFIRMADO,
    );
    const canceladosEnRango = turnosEnRango.filter(
      (turno) => turno.estado === AppointmentStatus.CANCELADO,
    );
    const pacientesAtendidos = new Set(
      confirmadosEnRango.map((turno) => turno.mascota.idMascota),
    ).size;

    return {
      rangoDesde,
      rangoHasta,
      resumen: {
        totalTurnos: confirmadosEnRango.length + canceladosEnRango.length,
        confirmados: confirmadosEnRango.length,
        cancelados: canceladosEnRango.length,
        tasaCancelacion: this.calcularPorcentaje(
          canceladosEnRango.length,
          confirmadosEnRango.length + canceladosEnRango.length,
        ),
        pacientesAtendidos,
      },
      turnosPorMes: this.agruparTurnosPorMes(turnosEnRango, rangoDesde, rangoHasta),
      ocupacionPorDia: this.calcularOcupacionPorDia(
        confirmadosEnRango,
        disponibilidades,
        rangoDesde,
        rangoHasta,
      ),
      horariosPico: this.calcularHorariosPico(turnosEnRango),
      pacientesPorMes: this.calcularPacientesPorMes(
        confirmadosEnRango,
        todosConfirmados,
        rangoDesde,
        rangoHasta,
      ),
    };
  }

  private agruparTurnosPorMes(
    turnos: TurnoVeterinario[],
    rangoDesde: string,
    rangoHasta: string,
  ): TurnosPorMesDto[] {
    const meses = this.generarClavesDeMes(rangoDesde, rangoHasta);
    const contadores = new Map<string, { confirmados: number; cancelados: number }>();
    for (const mes of meses) {
      contadores.set(mes, { confirmados: 0, cancelados: 0 });
    }

    for (const turno of turnos) {
      const clave = turno.fecha.slice(0, 7);
      const contador = contadores.get(clave);
      if (!contador) {
        continue;
      }
      if (turno.estado === AppointmentStatus.CONFIRMADO) {
        contador.confirmados++;
      } else if (turno.estado === AppointmentStatus.CANCELADO) {
        contador.cancelados++;
      }
    }

    return meses.map((mes) => ({
      mes,
      etiqueta: this.etiquetaMes(mes),
      ...contadores.get(mes)!,
    }));
  }

  /**
   * Porcentaje de cupos ocupados por día de la semana. La capacidad de un día
   * surge de sumar, en cada franja configurada para ese día, sus cupos por
   * turno multiplicados por la cantidad de turnos de 30' que entran en la
   * franja; esa capacidad semanal se multiplica por la cantidad de veces que
   * ese día cae dentro del rango elegido.
   */
  private calcularOcupacionPorDia(
    confirmados: TurnoVeterinario[],
    disponibilidades: DisponibilidadVeterinaria[],
    rangoDesde: string,
    rangoHasta: string,
  ): OcupacionPorDiaDto[] {
    const ocurrenciasPorDia = this.contarOcurrenciasPorDiaSemana(rangoDesde, rangoHasta);

    const capacidadSemanalPorDia = new Map<DiaSemana, number>();
    for (const disponibilidad of disponibilidades) {
      const slots = this.contarSlots(disponibilidad.horaInicio, disponibilidad.horaFin);
      const actual = capacidadSemanalPorDia.get(disponibilidad.diaSemana) ?? 0;
      capacidadSemanalPorDia.set(
        disponibilidad.diaSemana,
        actual + slots * disponibilidad.cuposPorTurno,
      );
    }

    const ocupadosPorDia = new Map<DiaSemana, number>();
    for (const turno of confirmados) {
      const dia = this.diaSemanaDeFecha(turno.fecha);
      ocupadosPorDia.set(dia, (ocupadosPorDia.get(dia) ?? 0) + 1);
    }

    return DIAS_ORDENADOS.filter((dia) => capacidadSemanalPorDia.has(dia)).map((dia) => {
      const capacidad =
        (capacidadSemanalPorDia.get(dia) ?? 0) * (ocurrenciasPorDia.get(dia) ?? 0);
      const ocupados = ocupadosPorDia.get(dia) ?? 0;
      return {
        diaSemana: dia,
        etiqueta: ETIQUETAS_DIA[dia],
        ocupados,
        capacidad,
        porcentaje: this.calcularPorcentaje(ocupados, capacidad, true),
      };
    });
  }

  /** Cantidad de turnos (confirmados y cancelados) agrupados por hora del día, para ver la demanda real. */
  private calcularHorariosPico(turnos: TurnoVeterinario[]): HorarioPicoDto[] {
    const contadorPorHora = new Map<number, number>();
    for (const turno of turnos) {
      const hora = Number(turno.hora.slice(0, 2));
      contadorPorHora.set(hora, (contadorPorHora.get(hora) ?? 0) + 1);
    }

    return [...contadorPorHora.entries()]
      .sort(([horaA], [horaB]) => horaA - horaB)
      .map(([hora, cantidad]) => ({
        hora,
        etiqueta: `${String(hora).padStart(2, '0')}:00`,
        cantidad,
      }));
  }

  /**
   * Un paciente es "nuevo" en un mes si ese mes contiene su primer turno
   * confirmado de siempre con este veterinario; si ya lo había atendido
   * antes, cuenta como recurrente.
   */
  private calcularPacientesPorMes(
    confirmadosEnRango: TurnoVeterinario[],
    todosConfirmados: TurnoVeterinario[],
    rangoDesde: string,
    rangoHasta: string,
  ): PacientesPorMesDto[] {
    const primeraFechaPorMascota = new Map<number, string>();
    for (const turno of todosConfirmados) {
      const actual = primeraFechaPorMascota.get(turno.mascota.idMascota);
      if (!actual || turno.fecha < actual) {
        primeraFechaPorMascota.set(turno.mascota.idMascota, turno.fecha);
      }
    }

    const meses = this.generarClavesDeMes(rangoDesde, rangoHasta);
    const mascotasPorMes = new Map<string, Set<number>>();
    for (const mes of meses) {
      mascotasPorMes.set(mes, new Set());
    }

    for (const turno of confirmadosEnRango) {
      const clave = turno.fecha.slice(0, 7);
      mascotasPorMes.get(clave)?.add(turno.mascota.idMascota);
    }

    return meses.map((mes) => {
      const mascotas = mascotasPorMes.get(mes) ?? new Set<number>();
      let nuevos = 0;
      for (const idMascota of mascotas) {
        if (primeraFechaPorMascota.get(idMascota)?.slice(0, 7) === mes) {
          nuevos++;
        }
      }
      return {
        mes,
        etiqueta: this.etiquetaMes(mes),
        nuevos,
        recurrentes: mascotas.size - nuevos,
      };
    });
  }

  /** Sin fechas explícitas, el dashboard muestra los últimos 6 meses (incluyendo el actual). */
  private resolverRango(desde?: string, hasta?: string): { rangoDesde: string; rangoHasta: string } {
    const hastaFecha = hasta ? this.parseFecha(hasta) : new Date();
    const desdeFecha = desde ? this.parseFecha(desde) : this.sumarMeses(hastaFecha, -5);
    const desdeInicioMes = new Date(desdeFecha.getFullYear(), desdeFecha.getMonth(), 1);

    return {
      rangoDesde: this.toIso(desdeInicioMes),
      rangoHasta: this.toIso(hastaFecha),
    };
  }

  private generarClavesDeMes(rangoDesde: string, rangoHasta: string): string[] {
    const claves: string[] = [];
    const [anioDesde, mesDesde] = rangoDesde.split('-').map(Number);
    const [anioHasta, mesHasta] = rangoHasta.split('-').map(Number);

    let cursor = new Date(anioDesde, mesDesde - 1, 1);
    const limite = new Date(anioHasta, mesHasta - 1, 1);

    while (cursor <= limite) {
      claves.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`);
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }

    return claves;
  }

  private contarOcurrenciasPorDiaSemana(
    rangoDesde: string,
    rangoHasta: string,
  ): Map<DiaSemana, number> {
    const ocurrencias = new Map<DiaSemana, number>();
    const desde = this.parseFecha(rangoDesde);
    const hasta = this.parseFecha(rangoHasta);

    for (
      let cursor = new Date(desde);
      cursor <= hasta;
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)
    ) {
      const dia = DIAS_POR_INDICE[cursor.getDay()];
      ocurrencias.set(dia, (ocurrencias.get(dia) ?? 0) + 1);
    }

    return ocurrencias;
  }

  private contarSlots(horaInicio: string, horaFin: string): number {
    const inicio = this.aMinutos(horaInicio);
    const fin = this.aMinutos(horaFin);
    return Math.max(0, Math.floor((fin - inicio) / DURACION_TURNO_MINUTOS));
  }

  private aMinutos(hora: string): number {
    const [horas, minutos] = hora.split(':').map(Number);
    return horas * 60 + minutos;
  }

  private diaSemanaDeFecha(fecha: string): DiaSemana {
    const [anio, mes, dia] = fecha.split('-').map(Number);
    return DIAS_POR_INDICE[new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay()];
  }

  private calcularPorcentaje(parte: number, total: number, capAt100 = false): number {
    if (total <= 0) {
      return 0;
    }
    const valor = (parte / total) * 100;
    return Math.round((capAt100 ? Math.min(100, valor) : valor) * 10) / 10;
  }

  private etiquetaMes(mes: string): string {
    const [anio, numeroMes] = mes.split('-').map(Number);
    return `${MESES_CORTOS[numeroMes - 1]} ${anio}`;
  }

  /** Parsea "YYYY-MM-DD" como fecha local, para no correrse de día por huso horario. */
  private parseFecha(fecha: string): Date {
    const [anio, mes, dia] = fecha.split('-').map(Number);
    return new Date(anio, mes - 1, dia);
  }

  private sumarMeses(fecha: Date, delta: number): Date {
    return new Date(fecha.getFullYear(), fecha.getMonth() + delta, fecha.getDate());
  }

  private toIso(fecha: Date): string {
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }

  private async findVeterinarioValidado(idUsuario: number): Promise<Veterinario> {
    const veterinario = await this.veterinariosRepository.findOne({
      where: { usuario: { idUsuario } },
    });

    if (!veterinario || veterinario.estadoValidacion !== ValidationStatus.APROBADO) {
      throw new ForbiddenException({
        codigoEstado: 403,
        mensaje: 'Su cuenta de veterinario no esta validada',
      });
    }

    return veterinario;
  }
}
