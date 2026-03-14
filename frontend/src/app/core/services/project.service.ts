import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
  updateDoc,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Project } from '../models/project.model';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private firestore = inject(Firestore);
  private injector = inject(Injector);
  private readonly collectionName = 'projects';

  /** Returns all projects belonging to the given user. */
  getProjects(uid: string): Observable<Project[]> {
    return runInInjectionContext(this.injector, () => {
      const ref = collection(this.firestore, this.collectionName);
      const q = query(ref, where('client_uid', '==', uid));
      return collectionData(q, { idField: 'project_id' }) as Observable<Project[]>;
    });
  }

  /** Creates a new project document in Firestore with a unique API key. */
  async createProject(uid: string, name: string, domain: string): Promise<void> {
    await runInInjectionContext(this.injector, () => {
      const ref = collection(this.firestore, this.collectionName);
      return addDoc(ref, {
        client_uid: uid,
        name,
        created_at: serverTimestamp(),
        api_key: crypto.randomUUID(),
        widget_config: {
          theme_color: '#4F46E5',
          persona: 'Professional and concise',
        },
        whitelisted_domain: domain,
      });
    });
  }

  /** Updates an existing project document in Firestore. */
  async updateProject(projectId: string, name: string, domain: string): Promise<void> {
    await runInInjectionContext(this.injector, async () => {
      const ref = doc(this.firestore, this.collectionName, projectId);
      return updateDoc(ref, {
        name,
        whitelisted_domain: domain,
      });
    });
  }

  /** Deletes a project by its document ID. */
  async deleteProject(projectId: string): Promise<void> {
    await runInInjectionContext(this.injector, () => {
      const ref = doc(this.firestore, this.collectionName, projectId);
      return deleteDoc(ref);
    });
  }
}
