import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ApiError } from '../../../auth/models/user';
import { DatosCuentaVeterinario } from '../../models/configuracion-veterinario';
import { ConfiguracionVeterinarioService } from '../../services/configuracion-veterinario-service';

function contraseñasCoincidenValidator(group: AbstractControl): ValidationErrors | null {
  const nueva = group.get('nueva')?.value;
  const confirmarNueva = group.get('confirmarNueva')?.value;
  return nueva && confirmarNueva && nueva !== confirmarNueva ? { noCoincide: true } : null;
}

@Component({
  selector: 'app-configuracion-veterinario',
  imports: [ReactiveFormsModule],
  templateUrl: './configuracion-veterinario.html',
  styleUrl: './configuracion-veterinario.css',
})
export class ConfiguracionVeterinarioPage implements OnInit {
  private readonly configuracionService = inject(ConfiguracionVeterinarioService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly datos = signal<DatosCuentaVeterinario | null>(null);

  protected readonly isCambiandoContrasena = signal(false);
  protected readonly contrasenaError = signal<string | null>(null);
  protected readonly contrasenaSuccess = signal<string | null>(null);

  protected readonly formContrasena = this.formBuilder.group(
    {
      actual: ['', [Validators.required, Validators.minLength(8)]],
      nueva: ['', [Validators.required, Validators.minLength(8)]],
      confirmarNueva: ['', [Validators.required, Validators.minLength(8)]],
    },
    { validators: contraseñasCoincidenValidator },
  );

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.configuracionService.getMisDatos().subscribe({
      next: (datos) => {
        this.isLoading.set(false);
        this.datos.set(datos);
      },
      error: (error: ApiError) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.mensaje ?? 'No se pudieron cargar tus datos.');
      },
    });
  }

  protected cambiarContrasena(): void {
    if (this.formContrasena.invalid) {
      this.formContrasena.markAllAsTouched();
      return;
    }

    this.contrasenaError.set(null);
    this.contrasenaSuccess.set(null);
    this.isCambiandoContrasena.set(true);

    const { actual, nueva } = this.formContrasena.getRawValue();

    this.configuracionService
      .cambiarContrasena({ viejaContraseña: actual!, nuevaContraseña: nueva! })
      .subscribe({
        next: () => {
          this.isCambiandoContrasena.set(false);
          this.contrasenaSuccess.set('Contraseña actualizada correctamente.');
          this.formContrasena.reset();
        },
        error: (error: ApiError) => {
          this.isCambiandoContrasena.set(false);
          this.contrasenaError.set(error.mensaje ?? 'No se pudo cambiar la contraseña.');
        },
      });
  }
}
