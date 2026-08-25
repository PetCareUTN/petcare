import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../models/user';
import { VeterinariosService } from '../../../veterinarios/services/veterinarios-service';

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return password && confirmPassword && password !== confirmPassword
    ? { passwordsMismatch: true }
    : null;
}

const TELEFONO_PATTERN = /^[0-9+\-\s()]+$/;
const DOCUMENTO_PATTERN = /^\d{7,8}$/;

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: '../../auth.css',
})
export class RegisterPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly veterinariosService = inject(VeterinariosService);

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
  protected readonly selectedHabilitacionFile = signal<File | null>(null);

  protected readonly form = this.formBuilder.group(
    {
      nombre: ['', [Validators.required, Validators.maxLength(150)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
      telefono: ['', [Validators.required, Validators.pattern(TELEFONO_PATTERN)]],
      direccion: ['', [Validators.required, Validators.maxLength(255)]],
      numeroDocumento: ['', [Validators.required, Validators.pattern(DOCUMENTO_PATTERN)]],
      numeroMatricula: ['', [Validators.required, Validators.maxLength(50)]],
      provinciaMatricula: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator },
  );

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
  }

  onHabilitacionSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedHabilitacionFile.set(input.files?.[0] ?? null);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.selectedFile()) {
      this.errorMessage.set('Debés adjuntar la matrícula habilitante.');
      return;
    }

    if (!this.selectedHabilitacionFile()) {
      this.errorMessage.set('Debés adjuntar el certificado de habilitación.');
      return;
    }

    this.successMessage.set(null);
    this.errorMessage.set(null);
    this.isSubmitting.set(true);

    const value = this.form.getRawValue();
    const formData = new FormData();
    formData.append('nombre', value.nombre!);
    formData.append('email', value.email!);
    formData.append('password', value.password!);
    formData.append('telefono', value.telefono!);
    formData.append('direccion', value.direccion!);
    formData.append('numeroDocumento', value.numeroDocumento!);
    formData.append('numeroMatricula', value.numeroMatricula!);
    formData.append('provinciaMatricula', value.provinciaMatricula!);
    formData.append('matricula', this.selectedFile()!);
    formData.append('habilitacion', this.selectedHabilitacionFile()!);

    this.veterinariosService.registrar(formData).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.successMessage.set(
          'Cuenta creada correctamente. Un administrador revisará tu matrícula antes de que puedas iniciar sesión.',
        );
        this.form.reset();
        this.selectedFile.set(null);
        this.selectedHabilitacionFile.set(null);
      },
      error: (error: ApiError) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(error.mensaje ?? 'Ocurrió un error al registrar la cuenta.');
      },
    });
  }
}
