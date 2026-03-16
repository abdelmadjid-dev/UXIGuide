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
      { 
        path: 'projects/new', 
        loadComponent: () => import('./pages/projects/project-detail/project-detail').then(m => m.ProjectDetailPage) 
      },
      { 
        path: 'projects/:id', 
        loadComponent: () => import('./pages/projects/project-detail/project-detail').then(m => m.ProjectDetailPage) 
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
