import {Config} from "./types/config.types";
import {InterfaceManager} from "./ui/consent.ts";
import {connectWebsocket, sendImage, sendMessage, startAudio, stopAudio} from "./core/socket.ts";
import {generateUIMap, testHighlightElement} from "./core/mapper.ts";
import {captureSafeScreenshot} from "./core/capturer.ts";

class UXIGuideScript {
    private readonly apiKey: string;
    private config: Config;
    private isInitialized: boolean = false;
    private interfaceManager: InterfaceManager | null = null;

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
        this.interfaceManager = new InterfaceManager(() => {
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
        this.interfaceManager.callAction();

        this.isInitialized = true;
    }
}

// Attach to window for CDN usage
(window as any).UXIGuide = {
    Loader: UXIGuideScript
};

export default UXIGuideScript;