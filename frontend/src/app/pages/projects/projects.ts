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
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/services/auth.service';
import { ProjectService } from '../../core/services/project.service';
import { Project } from '../../core/models/project.model';
import { ConfigService } from '../../core/services/config.service';
import { environment } from '../../../environments/environment';
import { ProjectDeleteDialog } from './project-delete-dialog/project-delete-dialog';
import { fadeInUp } from '../../core/animations/gsap-animations';
import { take } from 'rxjs';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './projects.html',
  styleUrl: './projects.css',
})
export class ProjectsPage implements OnInit, AfterViewInit {
  private authService = inject(AuthService);
  private projectService = inject(ProjectService);
  private configService = inject(ConfigService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  readonly pageHeader = viewChild<ElementRef>('pageHeader');
  readonly projectGrid = viewChild<ElementRef>('projectGrid');

  projects = signal<Project[]>([]);
  isLoading = signal(true);
  private uid = '';

  /** Helper to handle Firestore Timestamp vs Date objects for the template pipe */
  getProjectDate(date: any): Date | null {
    if (!date) return null;
    if (date instanceof Date) return date;
    if (typeof date.toDate === 'function') return date.toDate();
    if (date.seconds) return new Date(date.seconds * 1000);
    return null;
  }

  ngOnInit(): void {
    // Fallback: clear loading state after 2s even if Firestore is slow

    this.authService.user$.pipe(take(1)).subscribe((user) => {
      if (user) {
        this.uid = user.uid;
        this.projectService.getProjects(user.uid).subscribe({
          next: (projects) => {
            this.projects.set(projects);
            this.isLoading.set(false);
          },
          error: (err) => {
            console.error('Firestore error:', err);
            this.isLoading.set(false);
            this.snackBar.open('Could not connect to database. Check console.', 'OK', { duration: 5000 });
          }
        });
      } else {
        this.isLoading.set(false);
      }
    });
  }

  ngAfterViewInit(): void {
    const header = this.pageHeader()?.nativeElement;
    if (header) fadeInUp(header);
  }

  openCreateDialog(): void {
    this.router.navigate(['/projects/new']);
  }

  openEditDialog(project: Project): void {
    this.router.navigate(['/projects', project.project_id]);
  }

  async deleteProject(project: Project): Promise<void> {
    const dialogRef = this.dialog.open(ProjectDeleteDialog, {
      width: '400px',
      data: { projectName: project.name }
    });

    dialogRef.afterClosed().subscribe(async (confirmed) => {
      if (confirmed) {
        await this.projectService.deleteProject(project.project_id);
        this.snackBar.open(`Project "${project.name}" deleted.`, 'OK', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'bottom',
        });
      }
    });
  }

  getScriptTag(project: Project): string {
    const cdnBase = this.configService.cdnBaseUrl;
    const apiEndpoint = this.configService.apiEndpoint;
    const p = project.persona_config || { tone: '', speed: '', formality: '' };
    const t = project.theme_config || {};

    return `<script 
  src="${cdnBase}/widget.js" 
  data-api-key="${project.api_key}" 
  data-endpoint="${apiEndpoint}"
  data-theme-fab-color="${t.fabColor || ''}"
  data-theme-on-fab-color="${t.onFabColor || ''}"
  data-theme-next-btn-color="${t.nextBtnColor || ''}"
  data-theme-on-next-btn-color="${t.onNextBtnColor || ''}"
  data-theme-modal-color="${t.modalColor || ''}"
  data-theme-modal-title-color="${t.modalTitleColor || ''}"
  data-theme-modal-body-color="${t.modalBodyColor || ''}"
  data-theme-feature-icon-color="${t.featureIconColor || ''}"
  data-theme-feature-title-color="${t.featureTitleColor || ''}"
  data-theme-feature-body-color="${t.featureBodyColor || ''}"
  data-theme-primary-button-color="${t.primaryButtonColor || ''}"
  data-theme-on-primary-button-color="${t.onPrimaryButtonColor || ''}"
  data-theme-secondary-button-color="${t.secondaryButtonColor || ''}"
  data-theme-on-secondary-button-color="${t.onSecondaryButtonColor || ''}"
></script>`;
  }

  copyScriptTag(scriptTag: string): void {
    navigator.clipboard.writeText(scriptTag).then(() => {
      this.snackBar.open('Script tag copied to clipboard!', 'OK', {
        duration: 2000,
        horizontalPosition: 'end',
        verticalPosition: 'bottom',
      });
    });
  }
}
