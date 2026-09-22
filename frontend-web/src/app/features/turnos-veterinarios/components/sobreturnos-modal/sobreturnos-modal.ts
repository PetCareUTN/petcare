import { Component, OnInit, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiError } from '../../../auth/models/user';
import { SobreturnoVeterinarioResponse } from '../../../sobreturnos-veterinarios/models/sobreturno-veterinario';
import { SobreturnosVeterinariosService } from '../../../sobreturnos-veterinarios/services/sobreturnos-veterinarios-service';

@Component({
  selector: 'app-sobreturnos-modal',
  imports: [ReactiveFormsModule],
  templateUrl: './sobreturnos-modal.html',
  styleUrl: './sobreturnos-modal.css',
})
export class SobreturnosModalComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly sobreturnosService = inject(SobreturnosVeterinariosService);

  readonly close = output<void>();

  protected readonly isLoading = signal(true);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly sobreturnos = signal<SobreturnoVeterinarioResponse[]>([]);
  protected readonly eliminandoId = signal<number | null>(null);

  protected readonly form = this.formBuilder.group({
    fecha: ['', [Validators.required]],
    hora: ['', [Validators.required]],
    cupos: [1, [Validators.required, Validators.min(1), Validators.max(20)]],
  });

  ngOnInit(): void {
    this.cargarSobreturnos();
  }

  private cargarSobreturnos(): void {
    this.isLoading.set(true);
    this.sobreturnosService.getMine().subscribe({
      next: (sobreturnos) => {
        this.isLoading.set(false);
        this.sobreturnos.set(this.ordenar(sobreturnos));
      },
      error: (error: ApiError) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.mensaje ?? 'No se pudieron cargar los sobreturnos.');
      },
    });
  }

  protected agregar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Completá la fecha, la hora y la cantidad de cupos.');
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isSubmitting.set(true);

    const { fecha, hora, cupos } = this.form.getRawValue();

    this.sobreturnosService
      .create({ fecha: fecha!, hora: hora!, cupos: cupos! })
      .subscribe({
        next: (sobreturno) => {
          this.isSubmitting.set(false);
          this.sobreturnos.set(this.ordenar([...this.sobreturnos(), sobreturno]));
          this.successMessage.set('Sobreturno agregado correctamente.');
          this.form.patchValue({ fecha: '', hora: '', cupos: 1 });
          this.form.markAsPristine();
          this.form.markAsUntouched();
        },
        error: (error: ApiError) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(error.mensaje ?? 'No se pudo agregar el sobreturno.');
        },
      });
  }

  protected eliminar(sobreturno: SobreturnoVeterinarioResponse): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.eliminandoId.set(sobreturno.idSobreturno);

    this.sobreturnosService.remove(sobreturno.idSobreturno).subscribe({
      next: () => {
        this.eliminandoId.set(null);
        this.sobreturnos.set(
          this.sobreturnos().filter((s) => s.idSobreturno !== sobreturno.idSobreturno),
        );
        this.successMessage.set('Sobreturno eliminado.');
      },
      error: (error: ApiError) => {
        this.eliminandoId.set(null);
        this.errorMessage.set(error.mensaje ?? 'No se pudo eliminar el sobreturno.');
      },
    });
  }

  protected cerrar(): void {
    this.close.emit();
  }

  private ordenar(
    sobreturnos: SobreturnoVeterinarioResponse[],
  ): SobreturnoVeterinarioResponse[] {
    return [...sobreturnos].sort((a, b) =>
      `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`),
    );
  }
}
