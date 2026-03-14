import { Component, inject, signal, AfterViewInit, ElementRef, viewChild } from '@angular/core';
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

  email = '';
  password = '';
  isRegisterMode = signal(false);
  isLoading = signal(false);
  errorMessage = signal('');

  ngAfterViewInit(): void {
    const el = this.loginCard()?.nativeElement;
    if (el) fadeInUp(el);
  }

  async onSubmit(): Promise<void> {
    if (!this.email || !this.password) return;
    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      if (this.isRegisterMode()) {
        await this.authService.register(this.email, this.password);
      } else {
        await this.authService.loginWithEmail(this.email, this.password);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      this.errorMessage.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }

  async onGoogleLogin(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      await this.authService.loginWithGoogle();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed';
      this.errorMessage.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }

  toggleMode(): void {
    this.isRegisterMode.update((v) => !v);
    this.errorMessage.set('');
  }
}
