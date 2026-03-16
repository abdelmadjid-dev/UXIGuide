import {Config} from "./common/config.types";
import {UIManager} from "./ui/UIManager.ts";
import {userInitiatedClosure, connectWebsocket, sendImage, sendMessage, startAudio} from "./core/socket.ts";

import {INITIALIZE_SESSION, STEP_COMPLETED, UPDATE_VISUAL_MEMORY} from "./common/commands.ts";
import {captureSafeScreenshot, UIChangesWatcher} from "./core/capturer.ts";
import {generateUIMap} from "./core/mapper.ts";

import './ui/styles.css';

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

        const apiKey = scriptEl.getAttribute('data-api-key');
        const endpoint = scriptEl.getAttribute('data-endpoint');

        if (!apiKey || !endpoint) {
            console.warn('UXIGuide: Missing data-api-key or data-endpoint on <script> tag. Skipping auto-init.');
            return null;
        }

        return new UXIGuideScript({apiKey, endpoint});
    }
}

// Attach to window for CDN usage
(window as any).UXIGuide = {
    Loader: UXIGuideScript
};

// Auto-initialize if data attributes are present on the script tag
UXIGuideScript.fromScript();

export default UXIGuideScript;