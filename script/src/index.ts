import {Config} from "./types/config.types";
import {captureSafeScreenshot} from "./core/capturer.ts";

class UXIGuideScript {
    private readonly apiKey: string;
    private config: Config;
    private isInitialized: boolean = false;

    constructor(config: Config) {
        if (!config.apiKey) {
            console.error('UXIGuideScript: Missing API Key');
            throw new Error('API Key is required');
        }

        this.apiKey = config.apiKey;
        this.config = {
            serverUrl: 'wss://api.uxiguide.com/ws', // TODO: change endpoint
            debug: false,
            ...config
        };

        this.init();
    }

    private init(): void {
        if (this.isInitialized) return;

        if (this.config.debug) {
            console.log(`UXIGuideScript Initializing with key: ${this.apiKey}`);
        }

        // Initialize WebSocket connection
        // this.socket = new SocketManager(this.config.serverUrl);

        // Setup UI elements (Highlighter/Screenshot buttons)
        // this.ui = new VisualHighlighter();

        this.isInitialized = true;
    }

    async takeScreenshot(): Promise<string> {
        return await captureSafeScreenshot()
    }
}

// Attach to window for CDN usage
// This allows: new window.UXIGuide.Loader({ apiKey: 'abc-123' })
(window as any).UXIGuide = {
    Loader: UXIGuideScript
};

export default UXIGuideScript;