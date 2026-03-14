import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LoginPage } from './pages/login/login';
import { ProjectsPage } from './pages/projects/projects';

export const routes: Routes = [
  { path: 'login', component: LoginPage },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'projects', pathMatch: 'full' },
      { path: 'projects', component: ProjectsPage },
    ],
  },
  { path: '**', redirectTo: '' },
];
