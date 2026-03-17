import {Config} from "./common/config.types";
import {UIManager} from "./ui/UIManager.ts";
import {userInitiatedClosure, connectWebsocket, sendImage, sendMessage, startAudio} from "./core/socket.ts";

import {INITIALIZE_SESSION, STEP_COMPLETED, UPDATE_VISUAL_MEMORY} from "./common/commands.ts";
import {captureSafeScreenshot, UIChangesWatcher} from "./core/capturer.ts";
import {generateUIMap} from "./core/mapper.ts";

import './ui/styles.css';

// Audio assets will be initialized after script base path is detected
let startingSound: HTMLAudioElement;
let captureSound: HTMLAudioElement;

class UXIGuideScript {
    private readonly apiKey: string;
    private readonly config: Config;
    private isInitialized: boolean = false;
    private uiManager: UIManager | null = null;

    constructor(config: Config) {
        if (!config.apiKey) {
            console.error('UXIGuideScript: Missing API Key');
            throw new Error('API Key is required');
        }
        if (!config.endpoint) {
            console.error('UXIGuideScript: Missing endpoint');
            throw new Error('Endpoint is required');
        }

        this.apiKey = config.apiKey;
        this.config = {
            debug: true,
            ...config
        };

        this.init();
    }

    // Watcher
    watcher = new UIChangesWatcher(async () => {
        const screenshot = await captureSafeScreenshot();
        await captureSound.play();
        this.uiManager?.showFlash();
        this.uiManager?.showToast("Screenshot taken! 📸");
        sendImage(screenshot.split(',')[1]);
        const map = JSON.stringify(generateUIMap());
        sendMessage(UPDATE_VISUAL_MEMORY(map));
    });

    private init(): void {
        if (this.isInitialized) return;

        if (this.config.debug) console.log(`UXIGuideScript Initializing with key: ${this.apiKey}`);

        // Initialize
        this.uiManager = new UIManager(
            // On Starting
            async () => {
                if (this.config.debug) console.log('UXIGuide: Consent Approved');
                // Initialize Websocket
                connectWebsocket(
                    this.config,
                    async (name: string, response: any) => {
                        switch (name) {
                            case "dispatch_next_action":
                                const ids: string[] = response.ids;
                                this.uiManager!.goToElement(ids[0]);
                                this.uiManager!.highlightElement(ids);
                                this.uiManager!.listenToElement(ids, () => sendMessage(STEP_COMPLETED));
                                break;
                        }
                    },
                    // On Connection Opened
                    async () => {
                        await startingSound.play();
                        sendMessage(INITIALIZE_SESSION);
                        this.watcher.initialTrigger();
                        startAudio();
                    },
                    // On Connection Closed
                    () => {
                        this.watcher.stopObserving();
                        this.uiManager?.stopHighlight();
                        this.uiManager!.stopAnimation();
                    },
                    // On Toast
                    (message, state) => this.uiManager!.showToast(message, state),
                    // On Interrupted
                    () => this.uiManager?.stopHighlight()
                );
            },
            // On Closing
            () => userInitiatedClosure(),
            // Theme Configuration
            this.config.theme
        );

        this.isInitialized = true;
    }

    /**
     * Factory: auto-initialize from <script> tag data attributes.
     * Usage: <script src="uxiguide.js" data-api-key="..." data-endpoint="wss://..."></script>
     */
    static fromScript(): UXIGuideScript | null {
        const scriptEl = document.currentScript as HTMLScriptElement | null;
        if (!scriptEl) return null;

        // Detect script origin to serve assets from CDN
        const scriptUrl = new URL(scriptEl.src);
        const scriptOrigin = scriptUrl.origin + scriptUrl.pathname.substring(0, scriptUrl.pathname.lastIndexOf('/'));
        
        startingSound = new Audio(`${scriptOrigin}/starting.mp3`);
        captureSound = new Audio(`${scriptOrigin}/capture.mp3`);
        
        if (typeof window !== 'undefined') {
            console.log(`UXIGuide: Audio assets origin: ${scriptOrigin}`);
        }

        const apiKey = scriptEl.getAttribute('data-api-key');
        const endpoint = scriptEl.getAttribute('data-endpoint');

        if (!apiKey || !endpoint) {
            console.warn('UXIGuide: Missing data-api-key or data-endpoint on <script> tag. Skipping auto-init.');
            return null;
        }

        // Theme Configuration Parsing
        const theme: any = {};
        const themeAttributes = [
            'fab-color', 'on-fab-color', 'next-btn-color', 'on-next-btn-color',
            'modal-color', 'modal-title-color', 'modal-body-color',
            'feature-icon-color', 'feature-title-color', 'feature-body-color',
            'primary-button-color', 'on-primary-button-color',
            'secondary-button-color', 'on-secondary-button-color'
        ];

        themeAttributes.forEach(attr => {
            const val = scriptEl.getAttribute(`data-theme-${attr}`);
            if (val) {
                // camelCase the attribute name
                const key = attr.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                theme[key] = val;
            }
        });

        return new UXIGuideScript({
            apiKey, 
            endpoint,
            theme: Object.keys(theme).length > 0 ? theme : undefined
        });
    }
}

// Attach to window for CDN usage
(window as any).UXIGuide = {
    Loader: UXIGuideScript
};

// Auto-initialize if data attributes are present on the script tag
UXIGuideScript.fromScript();

export default UXIGuideScript;