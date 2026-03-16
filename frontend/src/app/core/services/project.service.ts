import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  query,
  where,
  serverTimestamp,
  updateDoc,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Project, PersonaConfig, ThemeConfig } from '../models/project.model';
import { ConfigService } from './config.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private firestore = inject(Firestore);
  private injector = inject(Injector);
  private configService = inject(ConfigService);
  private readonly collectionName = 'projects';

  /** Returns all projects belonging to the given user. */
  getProjects(uid: string): Observable<Project[]> {
    return runInInjectionContext(this.injector, () => {
      const ref = collection(this.firestore, this.collectionName);
      const q = query(ref, where('client_uid', '==', uid));
      return collectionData(q, { idField: 'project_id' }) as Observable<Project[]>;
    });
  }

  /** Returns a single project by its ID. */
  async getProject(projectId: string): Promise<Project | null> {
    return runInInjectionContext(this.injector, async () => {
      const ref = doc(this.firestore, this.collectionName, projectId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return { project_id: snap.id, ...snap.data() } as Project;
      }
      return null;
    });
  }

  /** Creates a new project document in Firestore with a unique API key and prefilled script tag. */
  async createProject(uid: string, name: string, domain: string, personaConfig?: PersonaConfig, themeConfig?: ThemeConfig): Promise<string> {
    const apiKey = crypto.randomUUID();

    return runInInjectionContext(this.injector, async () => {
      const ref = collection(this.firestore, this.collectionName);
      const docRef = await addDoc(ref, {
        client_uid: uid,
        name,
        created_at: serverTimestamp(),
        api_key: apiKey,
        widget_config: {
          theme_color: themeConfig?.fabColor || '#4F46E5',
          persona: personaConfig?.tone || 'Professional and concise', // fallback for legacy persona field
        },
        persona_config: personaConfig || {
          tone: 'Use a formal and professional tone in all responses.',
          speed: 'Keep responses brief and get straight to the point.',
          formality: 'Stick to strict formal language and etiquette.',
        },
        theme_config: themeConfig || {
          fabColor: '#4F46E5',
          onFabColor: '#FFFFFF',
          nextBtnColor: '#4F46E5',
          onNextBtnColor: '#FFFFFF',
          modalColor: '#FFFFFF',
          modalTitleColor: '#111827',
          modalBodyColor: '#374151',
          featureIconColor: '#4F46E5',
          featureTitleColor: '#111827',
          featureBodyColor: '#4B5563',
          primaryButtonColor: '#4F46E5',
          onPrimaryButtonColor: '#FFFFFF',
          secondaryButtonColor: '#F3F4F6',
          onSecondaryButtonColor: '#111827',
        },
        whitelisted_domain: domain,
      });
      return docRef.id;
    });
  }

  /** Updates an existing project document in Firestore. */
  async updateProject(projectId: string, data: Partial<Project>): Promise<void> {
    await runInInjectionContext(this.injector, async () => {
      const ref = doc(this.firestore, this.collectionName, projectId);
      return updateDoc(ref, {
        ...data,
        updated_at: serverTimestamp(),
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
