import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '../../../auth/models/user';
import { AuthService } from '../../../auth/services/auth-service';
import { VeterinariosService } from '../../services/veterinarios-service';
import { NotificationBellComponent } from '../../../notificaciones/components/notification-bell/notification-bell';

@Component({
  selector: 'app-solicitar-validacion',
  imports: [ReactiveFormsModule, RouterLink, NotificationBellComponent],
  templateUrl: './solicitar-validacion.html',
  styleUrl: './solicitar-validacion.css',
})
export class SolicitarValidacionPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly veterinariosService = inject(VeterinariosService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly provincias = [
    'Buenos Aires',
    'Catamarca',
    'Chaco',
    'Chubut',
    'Ciudad Autónoma de Buenos Aires',
    'Corrientes',
    'Córdoba',
    'Entre Ríos',
    'Formosa',
    'Jujuy',
    'La Pampa',
    'La Rioja',
    'Mendoza',
    'Misiones',
    'Neuquén',
    'Río Negro',
    'Salta',
    'San Juan',
    'San Luis',
    'Santa Cruz',
    'Santa Fe',
    'Santiago del Estero',
    'Tierra del Fuego',
    'Tucumán',
  ];

  protected readonly isSubmitting = signal(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly selectedFile = signal<File | null>(null);

  protected readonly form = this.formBuilder.group({
    numeroDocumento: ['', [Validators.required, Validators.pattern(/^\d{7,8}$/)]],
    numeroMatricula: ['', [Validators.required, Validators.maxLength(50)]],
    provinciaMatricula: ['', [Validators.required, Validators.maxLength(100)]],
  });

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.veterinariosService.miEstado().subscribe({
      next: (solicitud) => {
        if (solicitud.estadoValidacion === 'APROBADO' || solicitud.estadoValidacion === 'PENDIENTE') {
          this.router.navigateByUrl('/veterinarios/estado');
        }
      },
      error: () => {
        // No tiene solicitud, puede mostrar el formulario
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
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

    if (!this.selectedFile()) {
      this.errorMessage.set('Debés adjuntar la matrícula habilitante.');
      return;
    }

    this.successMessage.set(null);
    this.errorMessage.set(null);
    this.isSubmitting.set(true);

    const value = this.form.getRawValue();
    const formData = new FormData();
    formData.append('numeroDocumento', value.numeroDocumento!);
    formData.append('numeroMatricula', value.numeroMatricula!);
    formData.append('provinciaMatricula', value.provinciaMatricula!);
    formData.append('matricula', this.selectedFile()!);

    this.veterinariosService.solicitar(formData).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.successMessage.set('Solicitud enviada correctamente. Esperá la revisión del administrador.');
        this.form.reset();
        this.selectedFile.set(null);
      },
      error: (error: ApiError) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(error.mensaje ?? 'Ocurrió un error al enviar la solicitud.');
      },
    });
  }
}
