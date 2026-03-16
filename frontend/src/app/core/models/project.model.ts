export interface PersonaConfig {
  tone: string;
  speed: string;
  formality: string;
  voice: string;
}

export interface ThemeConfig {
  fabColor?: string;
  onFabColor?: string;
  nextBtnColor?: string;
  onNextBtnColor?: string;
  modalColor?: string;
  modalTitleColor?: string;
  modalBodyColor?: string;
  featureIconColor?: string;
  featureTitleColor?: string;
  featureBodyColor?: string;
  primaryButtonColor?: string;
  onPrimaryButtonColor?: string;
  secondaryButtonColor?: string;
  onSecondaryButtonColor?: string;
}

export interface Project {
  project_id: string;
  client_uid: string;
  name: string;
  created_at: any; // Firestore Timestamp or Date
  api_key: string;
  script_tag?: string;
  widget_config: {
    theme_color: string;
    persona: string; // Keeping for legacy or general description
  };
  persona_config: PersonaConfig;
  theme_config: ThemeConfig;
  whitelisted_domain: string;
}
