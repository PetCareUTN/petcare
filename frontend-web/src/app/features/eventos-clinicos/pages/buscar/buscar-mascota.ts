import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-buscar-mascota',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './buscar-mascota.html',
  styleUrl: './buscar-mascota.css',
})
export class BuscarMascotaPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);

  protected readonly form = this.formBuilder.group({
    idMascota: [null as number | null, [Validators.required, Validators.min(1)]],
  });

  buscar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const idMascota = this.form.getRawValue().idMascota;
    this.router.navigate(['/eventos-clinicos/mascota', idMascota]);
  }
}
