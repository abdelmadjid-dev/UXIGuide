import { Component, inject, signal, AfterViewInit, ElementRef, viewChild, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';
import { fadeInUp } from '../../core/animations/gsap-animations';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginPage implements AfterViewInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  readonly loginCard = viewChild<ElementRef>('loginCard');

  email = signal('');
  password = signal('');
  confirmPassword = signal('');
  isRegisterMode = signal(false);
  isLoading = signal(false);
  private _errorMessage = signal('');
  errorMessage = this._errorMessage.asReadonly();

  passwordsMatch = computed(() => {
    if (!this.isRegisterMode()) return true;
    if (!this.confirmPassword() && !this.password()) return true;
    return this.password() === this.confirmPassword();
  });

  validationError = computed(() => {
    if (this.isRegisterMode() && !this.passwordsMatch()) {
      return 'Passwords do not match';
    }
    return '';
  });

  ngAfterViewInit(): void {
    const el = this.loginCard()?.nativeElement;
    if (el) fadeInUp(el);
  }

  async onSubmit(): Promise<void> {
    if (!this.email() || !this.password()) return;

    if (this.isRegisterMode() && this.validationError()) {
      return;
    }

    this.isLoading.set(true);
    this._errorMessage.set('');

    try {
      if (this.isRegisterMode()) {
        await this.authService.register(this.email(), this.password());
      } else {
        await this.authService.loginWithEmail(this.email(), this.password());
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      this._errorMessage.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }

  async onGoogleLogin(): Promise<void> {
    this.isLoading.set(true);
    this._errorMessage.set('');

    try {
      await this.authService.loginWithGoogle();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed';
      this._errorMessage.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }

  toggleMode(): void {
    this.isRegisterMode.update((v) => !v);
    this._errorMessage.set('');
    this.confirmPassword.set('');
  }
}
