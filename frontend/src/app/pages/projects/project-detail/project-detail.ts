import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
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
    RouterModule,
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
  private sanitizer = inject(DomSanitizer);
  private snackBar = inject(MatSnackBar);

  projectForm: FormGroup;
  isLoading = signal(false);
  isEditMode = signal(false);
  
  // Preview State Management
  previewState = signal<'idle' | 'consent' | 'recording' | 'next'>('idle');

  // Exact SVGs from script/src/ui/UIManager.ts
  readonly FAB_ICON_DEFAULT = `
    <svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" style="width: 24px; height: 24px;">
      <path fill="currentColor" d="M129.11,240.18v41.54q-32-1.31-47.55-17.66T66,213.45v-121h55.68V215.78Q121.68,235.78,129.11,240.18Zm14.28,41.54V239.66q6.84-4.41,6.85-23.88V92.49h55.68v121q0,34-15.42,50.35T143.39,281.72Z"/>
      <path fill="currentColor" d="M255,192.16l29.41,55.55L271,279.38h-54ZM218.49,92.49h55.39l96.23,186.89H315.86Zm118.22,92.67-30-58.15,12-34.52H373Z"/>
      <path fill="currentColor" d="M388.1,92.49h55.69V279.38H388.1Z"/>
      <path fill="currentColor" d="M100.65,355.6H66q.82-20.06,7.76-32.45A42.67,42.67,0,0,1,92.65,305q12-5.78,27.47-5.78a78.56,78.56,0,0,1,12,1q6.27,1,12.87,2.29l-3,26.74c-3.63-.66-6.74-1.17-9.33-1.55a53.66,53.66,0,0,0-7.83-.57q-8.09,0-13.37,2.44a15.56,15.56,0,0,0-7.84,8.64Q101.15,344.36,100.65,355.6Zm11.88,36v27.72q-13.86-.83-24.17-6.69t-16-17.85q-5.68-12-6.35-31.06h34.65q.33,12.39,3,18.91A15.34,15.34,0,0,0,112.53,391.63Zm8.25,27.88V382.17l-9.07-22.33h38.77v52.5a39.44,39.44,0,0,1-13.12,5.13A94.33,94.33,0,0,1,120.78,419.51Z"/>
      <path fill="currentColor" d="M195.69,396.2v21.19a33.54,33.54,0,0,1-10.56,1.79q-11.38,0-18.89-7t-7.51-21v-67h29.7v62.28Q188.43,395.21,195.69,396.2Zm6.6,9.13v-81.2H232v93.75H206.75Z"/>
      <path fill="currentColor" d="M244.37,294.78h31.35V317H244.37Zm.82,29.35h29.7v93.75h-29.7Z"/>
      <path fill="currentColor" d="M325.55,323.64v22.18q-6.44.65-8.25,7.5t-1.82,19.89q0,12.87,2,18.18t7.43,5.29h.66v21a30.44,30.44,0,0,1-10.4,1.79q-9.07,0-14.93-3.83A26.6,26.6,0,0,1,291,405.16a51.89,51.89,0,0,1-4.78-15.08,106.74,106.74,0,0,1-1.41-17.69q0-26.73,8.5-38.15t24.5-11.41a31.65,31.65,0,0,1,3.8.24C322.91,323.23,324.23,323.43,325.55,323.64ZM334,299.19l29.7-4.41v123.1H338.42L334,405Z"/>
      <path fill="currentColor" d="M417.13,419.51a69.31,69.31,0,0,1-17.74-2.12,31.72,31.72,0,0,1-13.78-7.5q-5.78-5.38-8.91-14.84t-3.14-24.13q0-22.82,8.25-35t26.57-13.12v24q-3.63,5.55-3.63,23.64,0,10.6,1.65,16.31a11.53,11.53,0,0,0,6.35,7.82q4.71,2.13,13.45,2.12A48.66,48.66,0,0,0,434,396q4-.64,7.84-1.47v22.18q-5.79,1.14-12.13,2A99.85,99.85,0,0,1,417.13,419.51ZM413,380.05V362h5.44q0-3.75-.24-8a17.11,17.11,0,0,0-1.73-7V323q15.66,1.31,22.6,11.17T446,362c0,3-.11,6.17-.33,9.37a63.22,63.22,0,0,1-1.16,8.72Z"/>
    </svg>
  `;

  readonly FAB_ICON_RECORDING = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="width: 24px; height: 24px;">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;

  readonly FAB_ICON_CHAT = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px;">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  `;

  // Sanitized computed properties for preview
  safeFabIcon = computed(() => {
    const state = this.previewState();
    let html = '';
    if (state === 'recording' || state === 'next') html = this.FAB_ICON_RECORDING;
    else if (state === 'idle') html = this.FAB_ICON_DEFAULT;
    else html = this.FAB_ICON_CHAT;
    
    return this.sanitizer.bypassSecurityTrustHtml(html);
  });

  setPreviewState(state: 'idle' | 'consent' | 'recording' | 'next') {
    this.previewState.set(state);
  }

  togglePreviewAction() {
    const current = this.previewState();
    if (current === 'idle') this.previewState.set('consent');
    else if (current === 'consent') this.previewState.set('recording');
    else if (current === 'recording') this.previewState.set('next');
    else if (current === 'next') this.previewState.set('idle');
  }
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
  
  voiceOptions = [
    { label: 'Aoede', value: 'Aoede', desc: 'Clear, melodic, feminine-leaning' },
    { label: 'Charon', value: 'Charon', desc: 'Gentle, wise, masculine-leaning' },
    { label: 'Fenrir', value: 'Fenrir', desc: 'Strong, determined, masculine-leaning' },
    { label: 'Kore', value: 'Kore', desc: 'Bright, youthful, feminine-leaning' },
    { label: 'Puck', value: 'Puck', desc: 'Energetic, playful, masculine-leaning' }
  ];

  colorCustomizationOptions = [
    { key: 'fabColor', label: 'FAB Background', desc: 'Main trigger button color' },
    { key: 'onFabColor', label: 'FAB Icon', desc: 'Color of the icon inside the FAB' },
    { key: 'nextBtnColor', label: 'Next Button BG', desc: 'Color of the "Next" navigation button' },
    { key: 'onNextBtnColor', label: 'Next Button Text', desc: 'Color of the text on the "Next" button' },
    { key: 'modalColor', label: 'Modal Background', desc: 'Main dialog background color' },
    { key: 'modalTitleColor', label: 'Modal Title', desc: 'Color of the main title text' },
    { key: 'modalBodyColor', label: 'Modal Body', desc: 'Color of the secondary/body text' },
    { key: 'featureIconColor', label: 'Feature Icon', desc: 'Color of the icons in features' },
    { key: 'featureTitleColor', label: 'Feature Title', desc: 'Color of the feature titles' },
    { key: 'featureBodyColor', label: 'Feature Body', desc: 'Color of the feature descriptions' },
    { key: 'primaryButtonColor', label: 'Primary Button BG', desc: 'Main action button background' },
    { key: 'onPrimaryButtonColor', label: 'Primary Button Text', desc: 'Main action button text' },
    { key: 'secondaryButtonColor', label: 'Secondary Button BG', desc: 'Secondary action button background' },
    { key: 'onSecondaryButtonColor', label: 'Secondary Button Text', desc: 'Secondary action button text' },
  ];

  constructor() {
    this.projectForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      whitelisted_domain: ['', [Validators.required, Validators.pattern(/^(?!:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/)]],
      api_key: [{ value: '', disabled: true }],
      persona_config: this.fb.group({
        tone: [this.toneOptions[0].value, Validators.required],
        speed: [this.speedOptions[0].value, Validators.required],
        formality: [this.formalityOptions[0].value, Validators.required],
        voice: ['Aoede', Validators.required]
      }),
      theme_config: this.fb.group({
        fabColor: ['#4F46E5'],
        onFabColor: ['#FFFFFF'],
        nextBtnColor: ['#4F46E5'],
        onNextBtnColor: ['#FFFFFF'],
        modalColor: ['#FFFFFF'],
        modalTitleColor: ['#111827'],
        modalBodyColor: ['#374151'],
        featureIconColor: ['#4F46E5'],
        featureTitleColor: ['#111827'],
        featureBodyColor: ['#4B5563'],
        primaryButtonColor: ['#4F46E5'],
        onPrimaryButtonColor: ['#FFFFFF'],
        secondaryButtonColor: ['#F3F4F6'],
        onSecondaryButtonColor: ['#111827'],
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
          },
          theme_config: project.theme_config || this.projectForm.get('theme_config')?.value
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
      persona_config: formValue.persona_config,
      theme_config: formValue.theme_config
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
          formValue.persona_config,
          formValue.theme_config
        );
        // Note: createProject uses default theme_config if not passed. 
        // We could update createProject to take theme_config if needed.
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
