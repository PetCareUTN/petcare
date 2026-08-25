import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth-service';
import { ApiError } from '../../models/user';

const RESEND_COOLDOWN_SECONDS = 60;
const STORAGE_KEY_PREFIX = 'petcare_recovery_sent_';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: '../../auth.css',
})
export class ResetPasswordPage implements OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly email = signal('');
  protected readonly cooldownSeconds = signal(0);
  protected readonly isResending = signal(false);

  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  protected readonly form = this.formBuilder.group(
    {
      codigo: ['', [Validators.required]],
      nuevaContrasena: ['', [Validators.required, Validators.minLength(8)]],
      confirmarContrasena: ['', [Validators.required]],
    },
    { validators: this.passwordMatchValidator },
  );

  constructor() {
    this.route.queryParams.subscribe((params) => {
      this.email.set(params['email'] ?? '');
      this.initCooldown();
    });
  }

  ngOnDestroy(): void {
    this.clearCountdown();
  }

  passwordMatchValidator(form: any): { [key: string]: boolean } | null {
    const nuevaContrasena = form.get('nuevaContrasena')?.value;
    const confirmarContrasena = form.get('confirmarContrasena')?.value;
    if (nuevaContrasena && confirmarContrasena && nuevaContrasena !== confirmarContrasena) {
      return { passwordMismatch: true };
    }
    return null;
  }

  resendCode(): void {
    if (this.cooldownSeconds() > 0 || this.isResending()) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isResending.set(true);

    this.authService.forgotPassword({ email: this.email() }).subscribe({
      next: (response) => {
        this.isResending.set(false);
        this.successMessage.set(response.mensaje ?? 'Se reenvió el código correctamente.');
        this.setCooldown(RESEND_COOLDOWN_SECONDS);
      },
      error: (error: ApiError) => {
        this.isResending.set(false);
        this.errorMessage.set(error.mensaje ?? 'Ocurrió un error al reenviar el código.');
      },
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isSubmitting.set(true);

    const { codigo, nuevaContrasena } = this.form.getRawValue();

    this.authService
      .resetPassword({
        email: this.email(),
        codigo: codigo!,
        nuevaContraseña: nuevaContrasena!,
      })
      .subscribe({
        next: (response) => {
          this.isSubmitting.set(false);
          this.successMessage.set(response.mensaje ?? 'Contraseña restablecida correctamente.');
          localStorage.removeItem(this.storageKey());
          setTimeout(() => {
            this.router.navigateByUrl('/login');
          }, 2000);
        },
        error: (error: ApiError) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(error.mensaje ?? 'Ocurrió un error al restablecer la contraseña.');
        },
      });
  }

  private initCooldown(): void {
    const sentAt = localStorage.getItem(this.storageKey());
    if (!sentAt) {
      this.setCooldown(RESEND_COOLDOWN_SECONDS);
      return;
    }

    const elapsed = Math.floor((Date.now() - Number(sentAt)) / 1000);
    const remaining = RESEND_COOLDOWN_SECONDS - elapsed;

    if (remaining > 0) {
      this.setCooldown(remaining);
    } else {
      this.cooldownSeconds.set(0);
    }
  }

  private setCooldown(seconds: number): void {
    this.clearCountdown();
    localStorage.setItem(this.storageKey(), String(Date.now()));
    this.cooldownSeconds.set(seconds);

    this.countdownInterval = setInterval(() => {
      const current = this.cooldownSeconds();
      if (current <= 1) {
        this.cooldownSeconds.set(0);
        this.clearCountdown();
      } else {
        this.cooldownSeconds.set(current - 1);
      }
    }, 1000);
  }

  private clearCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  private storageKey(): string {
    return `${STORAGE_KEY_PREFIX}${this.email()}`;
  }
}
