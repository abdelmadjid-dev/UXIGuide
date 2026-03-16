# UXIGuide

**Break the "text box" paradigm with an AI boarding assistant that sees, hears, and guides.**

UXIGuide is an interactive, AI-powered boarding assistant that integrates into any website via a simple `<script>` tag. Unlike traditional chatbots that rely solely on text, UXIGuide utilizes the **Google Gemini Multimodal Live API** and **ADK** to provide real-time guidance through voice and vision. It solves the ambiguity of complex web interfaces by "looking" at the user's screen (privacy-aware) and talking them through their journey while visually highlighting elements on the page.

## 🚀 Key Features

- **Multimodal Interaction**: Speak naturally to the agent and receive real-time voice guidance.
- **Visual Awareness**: The agent takes privacy-aware screenshots and analyzes the DOM tree to understand the context.
- **Dynamic Highlighting**: Real-time visual overlays (glowing borders, arrows) on actual UI elements.
- **Advanced Customization**: Configure AI personas, formality levels, and choose from 5 prebuilt Gemini voices.
- **Safe & Private**: Automatic redaction of sensitive elements flagged by developers.
- **Seamless Integration**: Centralized Dashboard for project management and one-click script integration.

## 🛠 Tech Stack

- **Frontend**: Angular 19, Angular Material 3, Tailwind CSS, GSAP.
- **Backend**: FastAPI (Python), Gemini Multimodal Live API, Google ADK.
- **Widget**: Vanilla TypeScript, Vite.
- **Infrastructure**: Google Cloud Run, Firebase Hosting, Firestore.

## 💻 Local Setup & Installation

Follow these steps to run the UXIGuide monorepo locally.

### Prerequisites
- Node.js (v22+)
- Python (v3.11+)
- Poetry (for Python dependency management)

### 1. Backend Setup
```bash
cd backend
poetry install
# Create a .env file with your Google Cloud credentials
# GOOGLE_APPLICATION_CREDENTIALS="path/to/creds.json"
# GOOGLE_API_KEY="your-gemini-api-key"
poetry run uvicorn app.main:app --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
ng serve
# Dashboard will be available at http://localhost:4200
```

### 3. Widget Script Setup
```bash
cd script
npm install
npm run build
# The built widget will be in script/dist/widget.js
```

## 📦 Script Integration

To integrate UXIGuide into your website, add the following script tag to your HTML.

### Loader Configuration
The script automatically initializes using data attributes passed to the tag:

```html
<script 
  src="https://uxiguide.benaether.com/v0.2/widget.js" 
  data-api-key="YOUR_PROJECT_API_KEY" 
  data-endpoint="wss://uxiguide-backend-v0-2.a.run.app/v0.2/api"
  data-theme-fab-color="#4F46E5"
  data-theme-on-fab-color="#FFFFFF"
></script>
```

### Redacting Sensitive Elements
To prevent the agent from "seeing" specific elements (like passwords or PII), add the `redact-uxiguide` class:

```html
<input type="password" aria-hidden="true">
```

## 📐 Architecture & Processes

For a deeper dive into how the system works, refer to the following documentation in the [/docs](./docs) directory:

- **[Architecture Diagram](./docs/architecture_diagram.png)**: Visual representation of the connection between Gemini, Cloud Run, and the User's browser.

## 📜 Versioning & Deployment
UXIGuide follows a strict versioned release model managed by **Jenkins**. Each release (e.g., `v0.1`, `v0.2`) is deployed to isolated paths on Cloud Run and Firebase, ensuring legacy integrations remain stable. 

Refer to the [Deployment Guide](./project_docs/deployment/deployment-guide.md) for CI/CD details.