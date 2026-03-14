import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProjectService } from '../../../core/services/project.service';
import { Project } from '../../../core/models/project.model';

interface DialogData {
  uid: string;
  project?: Project;
}

@Component({
  selector: 'app-project-create-edit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './project-create-edit-dialog.html',
  styleUrl: './project-create-edit-dialog.css',
})
export class ProjectCreateEditDialog implements OnInit {
  private dialogRef = inject(MatDialogRef<ProjectCreateEditDialog>);
  private data: DialogData = inject(MAT_DIALOG_DATA);
  private projectService = inject(ProjectService);

  projectName = '';
  domain = '';
  isLoading = signal(false);
  isEditMode = signal(false);

  ngOnInit(): void {
    if (this.data.project) {
      this.isEditMode.set(true);
      this.projectName = this.data.project.name;
      this.domain = this.data.project.whitelisted_domain || '';
    }
  }

  async onSave(): Promise<void> {
    if (!this.projectName.trim() || !this.domain.trim()) return;

    this.isLoading.set(true);
    try {
      if (this.isEditMode() && this.data.project) {
        await this.projectService.updateProject(
          this.data.project.project_id,
          this.projectName.trim(),
          this.domain.trim()
        );
      } else {
        await this.projectService.createProject(
          this.data.uid,
          this.projectName.trim(),
          this.domain.trim()
        );
      }
      this.dialogRef.close(this.projectName.trim());
    } catch (err) {
      console.error('Failed to save project:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
