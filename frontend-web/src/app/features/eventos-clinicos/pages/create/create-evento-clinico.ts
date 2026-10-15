import { Component, OnInit, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiError } from '../../../auth/models/user';
import { AuthService } from '../../../auth/services/auth-service';
import { RichTextEditorComponent } from '../../../../shared/components/rich-text-editor/rich-text-editor';
import { DictadoPorVozService } from '../../../../shared/services/dictado-por-voz-service';
import { MascotasService } from '../../../mascotas/services/mascotas-service';
import {
  ArchivoMedicoResponse,
  ClinicalEventType,
  CreateEventoClinicoRequest,
  SugerenciaEventoClinico,
  TipoVacuna,
} from '../../models/evento-clinico';
import { VACUNA_OPCIONES } from '../../models/vacuna-opciones';
import { EventosClinicosService } from '../../services/eventos-clinicos-service';
import { AsistenteVozComponent } from '../../components/asistente-voz/asistente-voz';
import { BotonDictadoComponent } from '../../components/boton-dictado/boton-dictado';
import { agregarTextoDictado } from '../../utils/agregar-texto-dictado';

type EventTypeOption = {
  value: ClinicalEventType;
  label: string;
};

/**
 * Límites de caracteres visibles (sin contar el markup HTML del editor) para
 * los campos de texto libre del evento clínico. La descripción es la
 * narrativa principal de la consulta, por eso tiene más margen; los otros
 * tres suelen ser más acotados en la práctica.
 */
const DESCRIPCION_MAX_LENGTH = 1000;
const CAMPO_CORTO_MAX_LENGTH = 500;

/** Campos de texto libre donde se puede dictar (P1-182). */
type CampoDictable = 'descripcion' | 'diagnostico' | 'tratamiento' | 'observaciones';

@Component({
  selector: 'app-create-evento-clinico',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    RichTextEditorComponent,
    AsistenteVozComponent,
    BotonDictadoComponent,
  ],
  templateUrl: './create-evento-clinico.html',
  styleUrl: './create-evento-clinico.css',
  providers: [DictadoPorVozService],
})
export class CreateEventoClinicoPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly eventosClinicosService = inject(EventosClinicosService);
  private readonly mascotasService = inject(MascotasService);
  protected readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dictado = inject(DictadoPorVozService);

  protected readonly eventTypes: EventTypeOption[] = [
    { value: 'consulta', label: 'Consulta' },
    { value: 'vacuna', label: 'Vacuna' },
    { value: 'diagnostico', label: 'Diagnostico' },
    { value: 'tratamiento', label: 'Tratamiento' },
    { value: 'cirugia', label: 'Cirugia' },
    { value: 'control', label: 'Control' },
    { value: 'observacion', label: 'Observacion' },
    { value: 'otro', label: 'Otro' },
  ];

  protected readonly vacunas = VACUNA_OPCIONES;

  protected readonly isSubmitting = signal(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly createdEventId = signal<number | null>(null);
  protected readonly archivosSubidos = signal<ArchivoMedicoResponse[]>([]);
  protected readonly uploadingArchivos = signal(false);
  protected readonly uploadError = signal<string | null>(null);
  protected readonly backQueryParams = signal<Record<string, string | number>>({});
  protected readonly mascotaNombre = signal<string | null>(null);
  protected readonly isLoadingMascota = signal(false);

  private readonly asistente = viewChild(AsistenteVozComponent);

  protected readonly descripcionMaxLength = DESCRIPCION_MAX_LENGTH;
  protected readonly campoCortoMaxLength = CAMPO_CORTO_MAX_LENGTH;

  protected readonly form = this.formBuilder.group({
    idMascota: [null as number | null, [Validators.required, Validators.min(1)]],
    tipo: ['consulta' as ClinicalEventType, [Validators.required]],
    fecha: [this.today(), [Validators.required]],
    descripcion: ['', [Validators.required]],
    diagnostico: [''],
    tratamiento: [''],
    observaciones: [''],
    vacuna: [null as TipoVacuna | null],
    proximaAplicacion: [''],
    ultimaDosis: [false],
  });

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigateByUrl('/login');
      return;
    }

    const idMascota = Number(
      this.route.snapshot.queryParamMap.get('idMascota') ??
        this.route.snapshot.queryParamMap.get('selectedPetId'),
    );
    if (Number.isInteger(idMascota) && idMascota > 0) {
      this.form.patchValue({ idMascota });
      this.cargarNombreMascota(idMascota);
    }

    this.backQueryParams.set(this.buildBackQueryParams());

    // Los campos de vacunación solo existen —y solo son obligatorios— cuando el
    // evento es una vacuna. Se enganchan y desenganchan al cambiar el tipo para
    // que el formulario no quede inválido por campos que ni se muestran.
    this.form.controls.tipo.valueChanges.subscribe(() => this.actualizarValidacionDeVacuna());
    this.form.controls.ultimaDosis.valueChanges.subscribe(() =>
      this.actualizarValidacionDeVacuna(),
    );
    this.actualizarValidacionDeVacuna();
  }

  /**
   * La vacuna es obligatoria en todo evento de tipo vacuna. La próxima
   * aplicación también, salvo que sea la última dosis: ahí no hay refuerzo
   * ni recordatorio.
   */
  private actualizarValidacionDeVacuna(): void {
    const { tipo, vacuna, proximaAplicacion, ultimaDosis } = this.form.controls;
    const esVacuna = tipo.value === 'vacuna';
    const pideProximaDosis = esVacuna && !ultimaDosis.value;

    vacuna.setValidators(esVacuna ? Validators.required : null);
    proximaAplicacion.setValidators(pideProximaDosis ? Validators.required : null);
    if (!esVacuna) {
      vacuna.setValue(null);
      ultimaDosis.setValue(false, { emitEvent: false });
    }
    if (!pideProximaDosis) {
      proximaAplicacion.setValue('');
    }
    vacuna.updateValueAndValidity();
    proximaAplicacion.updateValueAndValidity();
  }

  submit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigateByUrl('/login');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // Guardar es siempre una acción explícita: si quedó un dictado abierto se
    // corta acá, para que no siga escribiendo en el formulario ya enviado.
    this.dictado.detener();
    this.successMessage.set(null);
    this.errorMessage.set(null);
    this.createdEventId.set(null);
    this.archivosSubidos.set([]);
    this.uploadError.set(null);
    this.isSubmitting.set(true);

    const value = this.form.getRawValue();
    const payload: CreateEventoClinicoRequest = {
      idMascota: Number(value.idMascota),
      tipo: value.tipo!,
      fecha: value.fecha!,
      descripcion: value.descripcion!.trim(),
      diagnostico: this.optionalText(value.diagnostico),
      tratamiento: this.optionalText(value.tratamiento),
      observaciones: this.optionalText(value.observaciones),
    };

    if (value.tipo === 'vacuna') {
      payload.vacuna = value.vacuna!;
      if (value.ultimaDosis) {
        payload.ultimaDosis = true;
      } else {
        payload.proximaAplicacion = value.proximaAplicacion!;
      }
    }

    this.eventosClinicosService.create(payload).subscribe({
      next: (evento) => {
        this.isSubmitting.set(false);
        this.createdEventId.set(evento.idEvento);
        this.archivosSubidos.set(evento.archivos);
        this.successMessage.set(
          `Evento clinico registrado en la historia #${evento.idHistoria}.`,
        );
        this.form.reset({
          idMascota: evento.idMascota,
          tipo: 'consulta',
          fecha: this.today(),
          descripcion: '',
          diagnostico: '',
          tratamiento: '',
          observaciones: '',
          vacuna: null,
          proximaAplicacion: '',
          ultimaDosis: false,
        });
        this.asistente()?.reiniciar();
      },
      error: (error: ApiError) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(error.mensaje ?? 'Ocurrio un error al registrar el evento.');
      },
    });
  }

  // Sin contexto de atención: el veterinario acaba de crear el evento, así que
  // la mascota ya es su paciente.
  protected abrirArchivo(evento: Event, url: string): void {
    evento.preventDefault();
    this.eventosClinicosService.abrirArchivo(url).subscribe({
      error: () => this.uploadError.set('No se pudo abrir el archivo.'),
    });
  }

  protected subirArchivos(input: HTMLInputElement): void {
    const idEvento = this.createdEventId();
    if (idEvento === null) {
      return;
    }

    const archivos = input.files ? Array.from(input.files) : [];
    if (archivos.length === 0) {
      return;
    }

    this.uploadingArchivos.set(true);
    this.uploadError.set(null);

    this.eventosClinicosService.agregarArchivos(idEvento, archivos).subscribe({
      next: (nuevosArchivos) => {
        this.uploadingArchivos.set(false);
        input.value = '';
        this.archivosSubidos.update((actuales) => [...actuales, ...nuevosArchivos]);
      },
      error: (error: ApiError) => {
        this.uploadingArchivos.set(false);
        input.value = '';
        this.uploadError.set(error.mensaje ?? 'No se pudo adjuntar el archivo.');
      },
    });
  }

  /**
   * Vuelca la sugerencia del asistente de voz (P1-182) sin guardar. Lo que ya
   * estaba escrito en un campo no se pisa: lo sugerido se agrega debajo.
   */
  protected aplicarSugerencia(sugerencia: SugerenciaEventoClinico): void {
    if (sugerencia.tipo) {
      this.form.controls.tipo.setValue(sugerencia.tipo);
    }
    if (sugerencia.tipo === 'vacuna' && sugerencia.vacuna) {
      this.form.controls.vacuna.setValue(sugerencia.vacuna);
    }

    const campos: CampoDictable[] = ['descripcion', 'diagnostico', 'tratamiento', 'observaciones'];
    for (const campo of campos) {
      const texto = sugerencia[campo];
      if (texto) {
        this.agregarTexto(campo, texto, true);
      }
    }
  }

  /** Agrega texto dictado al final de un campo, sin perder lo que ya tenía. */
  protected agregarTexto(campo: CampoDictable, texto: string, nuevoParrafo = false): void {
    const control = this.form.controls[campo];
    const max = campo === 'descripcion' ? DESCRIPCION_MAX_LENGTH : CAMPO_CORTO_MAX_LENGTH;
    const html = agregarTextoDictado(control.value ?? '', texto, max, nuevoParrafo);
    if (html !== null) {
      control.setValue(html);
      control.markAsDirty();
    }
  }

  protected esVacuna(): boolean {
    return this.form.controls.tipo.value === 'vacuna';
  }

  protected mascotaDisplayText(): string {
    if (this.isLoadingMascota()) {
      return 'Cargando...';
    }
    const nombre = this.mascotaNombre();
    if (nombre) {
      return nombre;
    }
    const idMascota = this.form.controls.idMascota.value;
    return idMascota ? `Mascota #${idMascota}` : 'Sin mascota seleccionada';
  }

  private optionalText(value: string | null | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  }

  private cargarNombreMascota(idMascota: number): void {
    const ownerDocument = this.route.snapshot.queryParamMap.get('ownerDocument') ?? undefined;
    const ownerEmail = this.route.snapshot.queryParamMap.get('ownerEmail') ?? undefined;

    this.isLoadingMascota.set(true);
    this.mascotasService.getById(idMascota, { ownerDocument, ownerEmail }).subscribe({
      next: (mascota) => {
        this.isLoadingMascota.set(false);
        this.mascotaNombre.set(mascota.nombre);
      },
      error: () => {
        this.isLoadingMascota.set(false);
        this.mascotaNombre.set(null);
      },
    });
  }

  private buildBackQueryParams(): Record<string, string | number> {
    const params: Record<string, string | number> = {};
    const ownerDocument = this.route.snapshot.queryParamMap.get('ownerDocument');
    const ownerEmail = this.route.snapshot.queryParamMap.get('ownerEmail');
    const selectedPetId = this.route.snapshot.queryParamMap.get('selectedPetId');
    const idMascota = this.route.snapshot.queryParamMap.get('idMascota');

    if (ownerDocument) {
      params['ownerDocument'] = ownerDocument;
    } else if (ownerEmail) {
      params['ownerEmail'] = ownerEmail;
    }

    if (selectedPetId) {
      params['selectedPetId'] = selectedPetId;
    } else if (idMascota) {
      params['selectedPetId'] = idMascota;
    }

    return params;
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
