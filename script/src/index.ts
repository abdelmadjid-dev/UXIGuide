import {Config} from "./common/config.types";
import {UXIGuideUI} from "./ui/UXIGuideUI.ts";
import {userInitiatedClosure, connectWebsocket, sendImage, sendMessage, startAudio} from "./core/socket.ts";

import './ui/styles.css';
import {INITIALIZE_SESSION, STEP_COMPLETED, UPDATE_VISUAL_MEMORY} from "./common/commands.ts";
import {captureSafeScreenshot, UIChangesWatcher} from "./core/capturer.ts";
import {generateUIMap} from "./core/mapper.ts";

class UXIGuideScript {
    private readonly apiKey: string;
    private config: Config;
    private isInitialized: boolean = false;
    private ui: UXIGuideUI | null = null;

    constructor(config: Config) {
        if (!config.apiKey) {
            console.error('UXIGuideScript: Missing API Key');
            throw new Error('API Key is required');
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
        this.ui?.showFlash();
        this.ui?.showToast("Screenshot taken! 📸");
        const screenshot = await captureSafeScreenshot();
        sendImage(screenshot.split(',')[1]);
        const map = JSON.stringify(generateUIMap());
        sendMessage(UPDATE_VISUAL_MEMORY(map));
    });

    private init(): void {
        if (this.isInitialized) return;

        if (this.config.debug) console.log(`UXIGuideScript Initializing with key: ${this.apiKey}`);

        // Initialize
        this.ui = new UXIGuideUI(
            // On Open Connection
            async () => {
                if (this.config.debug) console.log('UXIGuide: Consent Approved');
                sendMessage(INITIALIZE_SESSION);
                this.watcher.initialTrigger();
                startAudio();
            },
            // On Close Connection
            () => {
                userInitiatedClosure();
            }
        );

        // Initialize Websocket
        connectWebsocket(
            async (name: string, response: any) => {
                switch (name) {
                    case "dispatch_next_action":
                        this.ui!.goToElement(response.id);
                        this.ui!.highlightElement(response.id);
                        this.ui!.listenToElement(response.id, () => sendMessage(STEP_COMPLETED));
                        break;
                }
            },
            // On Connection Closed
            () => this.ui!.stopAnimation(),
            // On Toast
            (message, state) => this.ui!.showToast(message, state)
        )

        this.isInitialized = true;
    }
}

// Attach to window for CDN usage
(window as any).UXIGuide = {
    Loader: UXIGuideScript
};

export default UXIGuideScript;