import { Injectable, inject } from '@angular/core';
import { RemoteConfig, getValue, fetchAndActivate } from '@angular/fire/remote-config';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private remoteConfig = inject(RemoteConfig);

  constructor() {
    const sanitizedVersion = environment.apiVersion.replace(/\./g, '_');
    // Basic settings for Remote Config
    this.remoteConfig.settings.minimumFetchIntervalMillis = environment.production ? 3600000 : 0;
    this.remoteConfig.defaultConfig = {
      [`cdn_url_${sanitizedVersion}`]: `${environment.cdnBaseUrl}/${environment.apiVersion}`,
      [`api_url_${sanitizedVersion}`]: `${environment.cdnBaseUrl}/${environment.apiVersion}/api`,
    };
    
    // Initial fetch
    fetchAndActivate(this.remoteConfig).catch((err) => 
      console.warn('Remote Config fetch failed, using defaults.', err)
    );
  }

  /**
   * Returns the CDN base URL for the current version.
   * Priority: Remote Config > Local Environment
   */
  get cdnBaseUrl(): string {
    const sanitizedVersion = environment.apiVersion.replace(/\./g, '_');
    return getValue(this.remoteConfig, `cdn_url_${sanitizedVersion}`).asString();
  }

  /**
   * Returns the API endpoint for the current version.
   * Priority: Remote Config > Local Environment
   */
  get apiEndpoint(): string {
    const sanitizedVersion = environment.apiVersion.replace(/\./g, '_');
    return getValue(this.remoteConfig, `api_url_${sanitizedVersion}`).asString();
  }
}
