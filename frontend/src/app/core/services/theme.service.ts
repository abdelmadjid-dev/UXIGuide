import { Injectable, signal } from '@angular/core';

export type Theme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly currentTheme = signal<Theme>(this.getStoredTheme());

  constructor() {
    this.applyTheme(this.currentTheme());
  }

  toggle(): void {
    const next: Theme = this.currentTheme() === 'dark' ? 'light' : 'dark';
    this.currentTheme.set(next);
    this.applyTheme(next);
    localStorage.setItem('uxiguide-theme', next);
  }

  private getStoredTheme(): Theme {
    const stored = localStorage.getItem('uxiguide-theme');
    return stored === 'light' ? 'light' : 'dark';
  }

  private applyTheme(theme: Theme): void {
    document.documentElement.setAttribute('data-theme', theme);
  }
}
