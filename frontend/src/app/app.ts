import {
  Component,
  inject,
  signal,
  OnInit,
  AfterViewInit,
  ElementRef,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';
import { fadeInUp } from './core/animations/gsap-animations';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatSlideToggleModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit, AfterViewInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  readonly themeService = inject(ThemeService);

  readonly sidebar = viewChild<ElementRef>('sidebarContent');

  isAuthenticated = signal(false);
  userEmail = signal('');
  userInitial = signal('');

  navItems: NavItem[] = [
    { label: 'Projects', icon: 'folder_open', route: '/projects' },
    { label: 'Analytics', icon: 'analytics', route: '/analytics' },
    { label: 'Knowledge Base', icon: 'menu_book', route: '/knowledge-base' },
  ];

  ngOnInit(): void {
    this.authService.user$.subscribe((user) => {
      this.isAuthenticated.set(!!user);
      if (user) {
        this.userEmail.set(user.email ?? '');
        this.userInitial.set((user.email?.[0] ?? 'U').toUpperCase());
      }
    });
  }

  ngAfterViewInit(): void {
    const el = this.sidebar()?.nativeElement;
    if (el) fadeInUp(el, 0.2);
  }

  async logout(): Promise<void> {
    await this.authService.logout();
  }

  isLoginPage(): boolean {
    return this.router.url === '/login';
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }
}
