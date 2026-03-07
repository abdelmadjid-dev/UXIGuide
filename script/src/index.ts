import {Config} from "./types/config.types";
import {UXIGuideUI} from "./ui/UXIGuideUI.ts";
import {connectWebsocket, sendImage, sendMessage, startAudio, stopAudio} from "./core/socket.ts";
import {generateUIMap, testHighlightElement} from "./core/mapper.ts";
import {captureSafeScreenshot} from "./core/capturer.ts";

import './ui/styles.css';

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

    private init(): void {
        if (this.isInitialized) return;

        if (this.config.debug) console.log(`UXIGuideScript Initializing with key: ${this.apiKey}`);

        // Initialize
        this.ui = new UXIGuideUI(() => {
            if (this.config.debug) console.log('UXIGuide: Consent Approved');
            // Start Communication
            connectWebsocket(
                // Opened Connection...
                () => {
                    if (this.config.debug) console.log('Connection with Websocket opened');
                    startAudio();
                    // TODO: highlight border + show icon
                },
                async (name: string, response: any) => {
                    switch (name) {
                        case "request_screenshot":
                            sendImage(await captureSafeScreenshot());
                            sendMessage(JSON.stringify(generateUIMap()));
                            break;
                        case "send_navigation_coordinates":
                            const bound = response.bound
                            testHighlightElement(bound.xmin, bound.xmax, bound.ymin, bound.ymax, false);
                            break;
                    }
                },
                // Closed Connection...
                () => {
                    if (this.config.debug) console.log('Connection with Websocket opened');
                    stopAudio();
                },
                () => {

                }
            )
        });
        this.ui.callAction();

        this.isInitialized = true;
    }
}

// Attach to window for CDN usage
(window as any).UXIGuide = {
    Loader: UXIGuideScript
};

export default UXIGuideScript;