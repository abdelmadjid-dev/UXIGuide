import { Injectable, inject } from '@angular/core';
import { RemoteConfig, getValue, fetchAndActivate } from '@angular/fire/remote-config';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private remoteConfig = inject(RemoteConfig);

  constructor() {
    // Basic settings for Remote Config
    this.remoteConfig.settings.minimumFetchIntervalMillis = environment.production ? 3600000 : 0;
    this.remoteConfig.defaultConfig = {
      [`cdn-url-${environment.apiVersion}`]: environment.cdnBaseUrl,
      [`api-url-${environment.apiVersion}`]: environment.cdnBaseUrl, // Fallback to same as CDN if not set
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
    return getValue(this.remoteConfig, `cdn-url-${environment.apiVersion}`).asString();
  }

  /**
   * Returns the API endpoint for the current version.
   * Priority: Remote Config > Local Environment
   */
  get apiEndpoint(): string {
    return getValue(this.remoteConfig, `api-url-${environment.apiVersion}`).asString();
  }
}
