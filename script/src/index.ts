import {Config} from "./types/config.types";
import {UIManager} from "./ui/consent.ts";

class UXIGuideScript {
    private readonly apiKey: string;
    private config: Config;
    private isInitialized: boolean = false;
    private ui: UIManager;

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

        // Initialize UI (FAB and Consent)
        this.ui = new UIManager(() => {
            if (this.config.debug) console.log('UXIGuide: Consent Approved');
        });

        this.isInitialized = true;
    }
}

// Attach to window for CDN usage
(window as any).UXIGuide = {
    Loader: UXIGuideScript
};

export default UXIGuideScript;