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

export interface AIConfig {
  voice?: string;
}

export interface Config {
  apiKey: string;
  endpoint: string;
  debug?: boolean;
  theme?: ThemeConfig;
  ai?: AIConfig;
}