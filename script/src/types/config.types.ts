export interface Config {
  apiKey: string;
  debug?: boolean;
  serverUrl?: string; // Useful if you have staging/prod backends
}