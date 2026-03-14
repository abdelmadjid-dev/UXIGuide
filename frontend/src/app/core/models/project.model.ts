export interface Project {
  project_id: string;
  client_uid: string;
  name: string;
  created_at: any; // Firestore Timestamp or Date
  api_key: string;
  script_tag: string;
  widget_config: {
    theme_color: string;
    persona: string;
  };
  whitelisted_domain: string;
}
