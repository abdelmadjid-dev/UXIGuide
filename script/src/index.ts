import {Config} from "./types/config.types";
import {UXIGuideUI} from "./ui/UXIGuideUI.ts";
import {closeWebsocket, connectWebsocket, sendImage, sendMessage, startAudio, stopAudio} from "./core/socket.ts";
import {generateUIMap} from "./core/mapper.ts";
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
        this.ui = new UXIGuideUI(
            // On Open Connection
            async () => {
                if (this.config.debug) console.log('UXIGuide: Consent Approved');
                startAudio();
                sendMessage("COMMAND::Hi");
            },
            // On Close Connection
            () => {
                closeWebsocket();
            }
        );

        // Initialize Websocket
        connectWebsocket(
            async (name: string, response: any) => {
                switch (name) {
                    case "request_screenshot":
                        this.ui?.showFlash();
                        this.ui?.showToast();
                        const map = JSON.stringify(generateUIMap());
                        sendMessage(`dom map: ${map}`);
                        const screenshot = await captureSafeScreenshot();
                        sendImage(screenshot.split(',')[1]);
                        sendMessage("COMMAND::image_sent");
                        break;
                    case "dispatch_next_action":
                        const bound = response.bound
                        this.ui?.highlightElement(bound.xmin, bound.xmax, bound.ymin, bound.ymax);
                        this.ui?.listenToElement(response.id, () => sendMessage("COMMAND::next"));
                        break;
                }
            },
            // Closed Connection...
            () => {
                if (this.config.debug) console.log('Connection with Websocket opened');
                stopAudio();
                this.ui?.stopAnimation();
            },
            // On Error
            () => {}
        )

        this.isInitialized = true;
    }
}

// Attach to window for CDN usage
(window as any).UXIGuide = {
    Loader: UXIGuideScript
};

export default UXIGuideScript;