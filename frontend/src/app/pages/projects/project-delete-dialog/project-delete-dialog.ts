import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-project-delete-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title class="dialog-title delete-title">
      <mat-icon class="dialog-title-icon delete-icon">warning</mat-icon>
      Delete Project
    </h2>
    <mat-dialog-content class="dialog-content">
      <div class="delete-content">
        <p>Are you sure you want to delete <strong>{{ data.projectName }}</strong>?</p>
        <p class="warn-message">This action cannot be undone. All project data and settings will be permanently lost.</p>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-button (click)="onCancel()" id="cancel-delete-btn">Cancel</button>
      <button mat-flat-button color="warn" (click)="onConfirm()" class="delete-confirm-btn" id="confirm-delete-btn">
        Delete Project
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .delete-title { color: #ef4444 !important; }
    .delete-icon { color: #ef4444 !important; }
    .delete-content { padding: 1rem 0; }
    .warn-message { color: #ef4444; font-size: 0.875rem; font-weight: 500; margin-top: 0.75rem; }
    .delete-confirm-btn { 
      background-color: #ef4444 !important; 
      color: white !important; 
      font-weight: 600;
      border-radius: 8px;
    }
  `]
})
export class ProjectDeleteDialog {
  private dialogRef = inject(MatDialogRef<ProjectDeleteDialog>);
  data: { projectName: string } = inject(MAT_DIALOG_DATA);

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
