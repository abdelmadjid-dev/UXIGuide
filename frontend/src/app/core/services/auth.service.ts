import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  user,
  User,
} from '@angular/fire/auth';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private router = inject(Router);
  private injector = inject(Injector);

  /** Observable of the current Firebase user (null when logged out). */
  readonly user$: Observable<User | null> = user(this.auth);

  async loginWithEmail(email: string, password: string): Promise<void> {
    await runInInjectionContext(this.injector, () =>
      signInWithEmailAndPassword(this.auth, email, password),
    );
    this.router.navigate(['/projects']);
  }

  async loginWithGoogle(): Promise<void> {
    await runInInjectionContext(this.injector, () =>
      signInWithPopup(this.auth, new GoogleAuthProvider()),
    );
    this.router.navigate(['/projects']);
  }

  async register(email: string, password: string): Promise<void> {
    await runInInjectionContext(this.injector, () =>
      createUserWithEmailAndPassword(this.auth, email, password),
    );
    this.router.navigate(['/projects']);
  }

  async logout(): Promise<void> {
    await runInInjectionContext(this.injector, () => signOut(this.auth));
    this.router.navigate(['/login']);
  }
}
