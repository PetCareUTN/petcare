import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import {
  categoriasPrestador,
  mensajeError,
  PrestadoresService,
  Reporte,
  SolicitudPrestador,
} from './prestadores.service';

@Component({
  selector: 'app-admin-prestadores',
  imports: [FormsModule, DatePipe],
  styleUrl: './prestadores.css',
  template: ` <div class="page">
    <h1>Validación de prestadores</h1>
    <p class="intro">
      Revisá cada categoría y registrá las comprobaciones realizadas. Subir documentos no equivale a
      tener la identidad o la experiencia verificadas.
    </p>
    <div class="actions">
      <button (click)="vista = 'solicitudes'">Solicitudes</button
      ><button class="secondary" (click)="vista = 'reportes'">Reportes</button
      ><button class="secondary" (click)="cargar()" [disabled]="ocupado()">Actualizar</button>
    </div>
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
    @if (mensaje()) {
      <p class="success" role="status">{{ mensaje() }}</p>
    }
    @if (cargando()) {
      <p>Cargando…</p>
    }
    @if (vista === 'solicitudes') {
      <label
        >Estado<select [(ngModel)]="filtro">
          <option value="">Todos</option>
          <option value="pendiente">Pendiente</option>
          <option value="correccion">Requiere correcciones</option>
          <option value="aprobado">Aprobado</option>
          <option value="rechazado">Rechazado</option>
          <option value="suspendido">Suspendido</option>
        </select></label
      >
      @for (s of solicitudes(); track s.id) {
        @if (!filtro || s.estado === filtro) {
          <article>
            <h2>{{ s.datos.nombreCompleto }} · {{ label(s.categoria) }}</h2>
            <p>
              <span class="badge">{{ s.estado }}</span> Actualizada
              {{ s.actualizada | date: 'short' }}
            </p>
            <button class="secondary" (click)="seleccionar(s)">
              Revisar solicitud #{{ s.id }}
            </button>
          </article>
        }
      }
      @if (!cargando() && solicitudes().length === 0) {
        <p>No hay solicitudes para revisar.</p>
      }
      @if (seleccionada(); as s) {
        <form #revisionForm="ngForm" (ngSubmit)="revisar(s)">
          <h2>Solicitud #{{ s.id }} · {{ s.datos.nombreCompleto }}</h2>
          <p>Documento: {{ s.datos.numeroDocumento }} · Teléfono: {{ s.datos.telefono }}</p>
          <h3>Experiencia</h3>
          <p class="detail">{{ s.datos.experiencia }}</p>
          <h3>Referencias</h3>
          <p class="detail">{{ s.datos.referencias || 'No informó referencias.' }}</p>
          <h3>Cuidados y emergencias</h3>
          <p class="detail">{{ s.datos.protocolo }}</p>
          @if (s.categoria === 'guarderia') {
            <p>Dirección: {{ s.datos.direccion }} · Capacidad: {{ s.datos.capacidad }} mascotas</p>
          }
          <h3>Evidencia privada</h3>
          <div class="actions">
            @for (d of s.documentos; track d.id) {
              <button type="button" class="secondary" (click)="descargar(d.id)">
                Descargar {{ d.tipo }} #{{ d.id }}
              </button>
            }
          </div>
          @if (s.documentos.length === 0) {
            <p class="error">
              No hay documentos vigentes. Pedí correcciones para que vuelva a adjuntarlos.
            </p>
          }
          <p>
            <small
              >Descargá los archivos solo para esta revisión y eliminá las copias locales al
              terminar. El sistema elimina los originales de la base activa a los 30 días.</small
            >
          </p>
          <details>
            <summary>Historial de decisiones</summary>
            @for (h of s.historial; track $index) {
              <p>
                {{ h.fecha | date: 'short' }} · {{ h.estado }} ·
                {{ h.idAdmin ? 'Administrador #' + h.idAdmin : 'Solicitante' }}: {{ h.motivo }}
              </p>
            }
          </details>
          @if (s.estado === 'pendiente' || s.estado === 'suspendido' || s.estado === 'aprobado') {
            <label
              >Decisión<select name="estado" [(ngModel)]="revision.estado" required>
                @if (s.estado === 'aprobado') {
                  <option value="suspendido">Suspender categoría</option>
                } @else {
                  <option value="correccion">Pedir correcciones</option>
                  <option value="aprobado">Aprobar categoría</option>
                  <option value="rechazado">Rechazar solicitud</option>
                }
              </select></label
            >
            @if (revision.estado === 'aprobado') {
              <label class="check"
                ><input
                  type="checkbox"
                  name="identidad"
                  [(ngModel)]="revision.identidadRevisada"
                />Comparé el documento con la persona mediante videollamada o comprobación
                equivalente.</label
              >
              <label class="check"
                ><input
                  type="checkbox"
                  name="contacto"
                  [(ngModel)]="revision.contactoVerificado"
                />Comprobé el teléfono mediante contacto efectivo.</label
              >
              <label class="check"
                ><input
                  type="checkbox"
                  name="condiciones"
                  [(ngModel)]="revision.condicionesRevisadas"
                />Revisé experiencia, protocolo y evidencia específica de la categoría.</label
              >
              <label class="check"
                ><input
                  type="checkbox"
                  name="referencias"
                  [(ngModel)]="revision.referenciasComprobadas"
                  [disabled]="!s.datos.referencias"
                />Contacté y comprobé las referencias informadas (opcional).</label
              >
            }
            <label
              >Motivo y comprobaciones realizadas<textarea
                name="motivo"
                [(ngModel)]="revision.motivo"
                required
                minlength="15"
                maxlength="2000"
                placeholder="Registrá método, fecha, resultado y correcciones necesarias. Este texto será visible para el solicitante."
              ></textarea>
            </label>
            <button
              [disabled]="
                revisionForm.invalid ||
                ocupado() ||
                (revision.estado === 'aprobado' &&
                  (!revision.identidadRevisada ||
                    !revision.contactoVerificado ||
                    !revision.condicionesRevisadas))
              "
            >
              {{ ocupado() ? 'Guardando…' : 'Guardar decisión' }}
            </button>
          }
        </form>
      }
    } @else {
      @if (!cargando() && reportes().length === 0) {
        <p>No hay reportes.</p>
      }
      @for (r of reportes(); track r.id) {
        <article>
          <h2>Reporte #{{ r.id }} · {{ r.prestador }} · {{ label(r.categoria) }}</h2>
          <p>Reserva #{{ r.idTurno }} · {{ r.denunciante }} · {{ r.estado }}</p>
          <p class="detail">{{ r.motivo }}</p>
          @if (r.resolucion) {
            <p class="detail">Resolución: {{ r.resolucion }}</p>
          }
          @if (r.estado === 'pendiente') {
            <label
              >Resolución<textarea
                [(ngModel)]="resoluciones[r.id]"
                minlength="15"
                maxlength="2000"
                placeholder="Describí la investigación y la decisión."
              ></textarea>
            </label>
            <label class="check"
              ><input
                type="checkbox"
                [(ngModel)]="suspensiones[r.id]"
                [disabled]="!r.idSolicitud"
              />Suspender nuevas publicaciones y reservas de esta categoría.</label
            >
            <p>
              <small
                >Las reservas ya confirmadas siguen visibles y deben revisarse con las partes. El
                reporte por sí solo no suspende al prestador.</small
              >
            </p>
            <button
              (click)="resolver(r)"
              [disabled]="ocupado() || (resoluciones[r.id] || '').trim().length < 15"
            >
              Resolver reporte
            </button>
          }
        </article>
      }
    }
  </div>`,
})
export class AdminPrestadoresPage implements OnInit {
  private readonly api = inject(PrestadoresService);
  readonly solicitudes = signal<SolicitudPrestador[]>([]);
  readonly reportes = signal<Reporte[]>([]);
  readonly seleccionada = signal<SolicitudPrestador | null>(null);
  readonly error = signal('');
  readonly mensaje = signal('');
  readonly ocupado = signal(false);
  readonly cargando = signal(true);
  vista = 'solicitudes';
  filtro = '';
  resoluciones: Record<number, string> = {};
  suspensiones: Record<number, boolean> = {};
  revision = {
    estado: 'correccion',
    motivo: '',
    identidadRevisada: false,
    contactoVerificado: false,
    condicionesRevisadas: false,
    referenciasComprobadas: false,
  };
  ngOnInit() {
    this.cargar();
  }
  cargar() {
    this.cargando.set(true);
    this.api.get<SolicitudPrestador[]>('admin/solicitudes').subscribe({
      next: (s) => {
        this.solicitudes.set(s);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.cargando.set(false);
      },
    });
    this.api
      .get<Reporte[]>('admin/reportes')
      .subscribe({
        next: (r) => this.reportes.set(r),
        error: (e) => this.error.set(mensajeError(e)),
      });
  }
  label(c: string) {
    return categoriasPrestador.find((x) => x.value === c)?.label ?? c;
  }
  seleccionar(s: SolicitudPrestador) {
    this.seleccionada.set(s);
    this.revision = {
      estado: s.estado === 'aprobado' ? 'suspendido' : 'correccion',
      motivo: '',
      identidadRevisada: false,
      contactoVerificado: false,
      condicionesRevisadas: false,
      referenciasComprobadas: false,
    };
  }
  descargar(id: number) {
    this.api.descargar(id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `documento-${id}.${blob.type === 'application/pdf' ? 'pdf' : blob.type === 'image/png' ? 'png' : 'jpg'}`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      error: () => this.error.set('No se pudo descargar el documento. Puede haber vencido.'),
    });
  }
  revisar(s: SolicitudPrestador) {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.error.set('');
    this.api
      .post(`admin/solicitudes/${s.id}/revision`, { ...this.revision, version: s.actualizada })
      .subscribe({
        next: () => {
          this.ocupado.set(false);
          this.seleccionada.set(null);
          this.mensaje.set('Decisión guardada y notificada.');
          this.cargar();
        },
        error: (e) => {
          this.ocupado.set(false);
          this.error.set(mensajeError(e));
        },
      });
  }
  resolver(r: Reporte) {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.error.set('');
    this.api
      .post(`admin/reportes/${r.id}/resolver`, {
        resolucion: this.resoluciones[r.id],
        suspender: this.suspensiones[r.id] ?? false,
      })
      .subscribe({
        next: () => {
          this.ocupado.set(false);
          this.mensaje.set('Reporte resuelto.');
          this.cargar();
        },
        error: (e) => {
          this.ocupado.set(false);
          this.error.set(mensajeError(e));
        },
      });
  }
}
