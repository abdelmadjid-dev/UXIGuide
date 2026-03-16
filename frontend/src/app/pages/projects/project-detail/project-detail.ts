import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { ProjectService } from '../../../core/services/project.service';
import { AuthService } from '../../../core/services/auth.service';
import { Project, PersonaConfig } from '../../../core/models/project.model';
import { take } from 'rxjs';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatSnackBarModule,
    MatTooltipModule,
  ],
  templateUrl: './project-detail.html',
  styleUrl: './project-detail.css'
})
export class ProjectDetailPage implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private projectService = inject(ProjectService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  projectForm: FormGroup;
  isEditMode = signal(false);
  isLoading = signal(false);
  projectId = signal<string | null>(null);
  uid = '';

  toneOptions = [
    { label: 'Professional', value: 'Use a formal and professional tone in all responses.' },
    { label: 'Friendly', value: 'Be warm, friendly, and encouraging.' },
    { label: 'Casual', value: 'Use relaxed, everyday language and a casual tone.' }
  ];

  speedOptions = [
    { label: 'Concise', value: 'Keep responses brief and get straight to the point.' },
    { label: 'Balanced', value: 'Provide a moderate amount of detail.' },
    { label: 'Detailed', value: 'Be thorough and provide exhaustive explanations.' }
  ];

  formalityOptions = [
    { label: 'Formal', value: 'Stick to strict formal language and etiquette.' },
    { label: 'Semi-formal', value: 'Balance professional address with an approachable style.' },
    { label: 'Informal', value: 'Omit formalities and use direct, simple address.' }
  ];

  constructor() {
    this.projectForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      whitelisted_domain: ['', [Validators.required, Validators.pattern(/^(?!:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/)]],
      api_key: [{ value: '', disabled: true }],
      persona_config: this.fb.group({
        tone: [this.toneOptions[0].value, Validators.required],
        speed: [this.speedOptions[0].value, Validators.required],
        formality: [this.formalityOptions[0].value, Validators.required]
      })
    });
  }

  ngOnInit(): void {
    this.authService.user$.pipe(take(1)).subscribe(user => {
      if (user) {
        this.uid = user.uid;
        const id = this.route.snapshot.paramMap.get('id');
        if (id && id !== 'new') {
          this.isEditMode.set(true);
          this.projectId.set(id);
          this.loadProject(id);
        }
      } else {
        this.router.navigate(['/login']);
      }
    });
  }

  async loadProject(id: string): Promise<void> {
    this.isLoading.set(true);
    try {
      const project = await this.projectService.getProject(id);
      if (project) {
        this.projectForm.patchValue({
          name: project.name,
          whitelisted_domain: project.whitelisted_domain,
          api_key: project.api_key,
          persona_config: project.persona_config || {
            tone: this.toneOptions[0].value,
            speed: this.speedOptions[0].value,
            formality: this.formalityOptions[0].value
          }
        });
      } else {
        this.snackBar.open('Project not found', 'OK', { duration: 3000 });
        this.router.navigate(['/projects']);
      }
    } catch (error) {
      console.error('Error loading project:', error);
      this.snackBar.open('Error loading project details', 'OK', { duration: 3000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.projectForm.invalid) return;

    this.isLoading.set(true);
    const formValue = this.projectForm.getRawValue();
    const projectData: Partial<Project> = {
      name: formValue.name,
      whitelisted_domain: formValue.whitelisted_domain,
      persona_config: formValue.persona_config
    };

    try {
      if (this.isEditMode()) {
        await this.projectService.updateProject(this.projectId()!, projectData);
        this.snackBar.open('Project updated successfully', 'OK', { duration: 3000 });
      } else {
        await this.projectService.createProject(
          this.uid,
          formValue.name,
          formValue.whitelisted_domain,
          formValue.persona_config
        );
        this.snackBar.open('Project created successfully', 'OK', { duration: 3000 });
      }
      this.router.navigate(['/projects']);
    } catch (error: any) {
      console.error('Error saving project:', error);
      this.snackBar.open('Error saving project', 'OK', { duration: 3000 });
    } finally {
      this.isLoading.set(false);
    }
  }
}
