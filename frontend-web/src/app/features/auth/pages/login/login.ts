import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth-service';
import { ApiError } from '../../models/user';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginPage implements AfterViewInit {
  @ViewChild('emailInput')
  private readonly emailInput?: ElementRef<HTMLInputElement>;

  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  /** Alterna entre mostrar la contraseña en texto plano y ocultarla. */
  protected readonly mostrarPassword = signal(false);

  protected readonly form = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  ngAfterViewInit(): void {
    /*
     * Foco en el email para poder escribir apenas entra, pero solo donde hay
     * mouse: en un celular abriria el teclado solo y taparia media pantalla.
     * Se mira el tipo de puntero y no el ancho, porque al momento de este hook
     * el viewport todavia puede medir 0.
     */
    if (!window.matchMedia('(pointer: fine)').matches) {
      return;
    }

    // Un tick despues, para que el campo ya este pintado y acepte el foco.
    setTimeout(() => this.emailInput?.nativeElement.focus());
  }

  protected alternarPassword(): void {
    this.mostrarPassword.update((visible) => !visible);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(true);

    const { email, password } = this.form.getRawValue();

    this.authService.login({ email: email!, password: password! }).subscribe({
      next: (response) => {
        this.isSubmitting.set(false);
        this.authService.saveToken(response.token);
        this.authService.saveRole(response.usuario.id_rol);
        this.router.navigateByUrl(
          this.authService.isVeterinario() ? '/eventos-clinicos' : '/',
        );
      },
      error: (error: ApiError) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(error.mensaje ?? 'Ocurrió un error al iniciar sesión.');
      },
    });
  }
}
