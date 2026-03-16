import {getDomain} from "tldjs";
import {Config} from "../common/config.types.ts";

let websocket: WebSocket | null = null;
let reconnectAttempts = 0;
const maxReconnectDelay = 30000; // Max 30 seconds
let heartbeatTimer: number | undefined = undefined;
const HEARTBEAT_TIMEOUT = 10000; // 10 seconds
let reconnectionTimeout: number | undefined;

// Build WebSocket URL with api_key authorization
function getWebSocketUrl(config: Config, userId: string, sessionId: string) {
    // Strip trailing slash from endpoint
    const endpoint = config.endpoint.replace(/\/+$/, '');

    // Determine ws/wss protocol from the endpoint
    let wsBase: string;
    if (endpoint.startsWith('http://')) {
        wsBase = 'ws://' + endpoint.slice(7);
    } else if (endpoint.startsWith('https://')) {
        wsBase = 'wss://' + endpoint.slice(8);
    } else if (endpoint.startsWith('ws://') || endpoint.startsWith('wss://')) {
        wsBase = endpoint;
    } else {
        // Default: infer from page protocol
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsBase = wsProtocol + '//' + endpoint;
    }

    const params = new URLSearchParams();
    params.set('api_key', config.apiKey);

    return `${wsBase}/interact/${userId}/${sessionId}?${params.toString()}`;
}

function startHeartbeat() {
    clearTimeout(heartbeatTimer);
    heartbeatTimer = setTimeout(() => {
        console.warn("Heartbeat lost. Closing connection.");
        if (websocket) websocket.close(4000, "Heartbeat timeout"); // Trigger onclose/backoff
    }, HEARTBEAT_TIMEOUT);
}

export async function connectWebsocket(
    config: Config,
    onFunctionCalled: (name: string, response: any) => void,
    onConnectionOpened: () => void,
    onConnectionClosed: () => void,
    showToast: (message: string, state: string) => void,
    onInterrupted: () => void,
) {
    // Connect websocket
    const userId = "user-" + await generateBrowserId();
    const sessionId = "session-" + crypto.randomUUID();
    const ws_url = getWebSocketUrl(config, userId, sessionId);
    websocket = new WebSocket(ws_url);

    websocket.onopen = () => {
        if (reconnectAttempts > 0) showToast("Back online! You can continue talking.", "info");
        reconnectAttempts = 0;
        onConnectionOpened();
    }
    websocket.onmessage = function (event) {
        // Every time we get ANY message (audio or ping), reset the timer
        startHeartbeat();
        if (event.data === "ping") {
            websocket!.send("pong");
            return;
        }

        // Parse the incoming ADK Event
        const adkEvent = JSON.parse(event.data);

        // Handle interrupted event
        if (adkEvent.interrupted === true) onInterrupted();

        // Handle content events (text or audio)
        if (adkEvent.content && adkEvent.content.parts) {
            const parts = adkEvent.content.parts;

            for (const part of parts) {
                // Handle inline data (audio)
                if (part.inlineData) {
                    const mimeType = part.inlineData.mimeType;
                    const data = part.inlineData.data;

                    if (mimeType && mimeType.startsWith("audio/pcm") && audioPlayerNode) {
                        audioPlayerNode.port.postMessage(base64ToArray(data));
                    }
                }

                // Handle Function Calling
                if (part.functionResponse) {
                    onFunctionCalled(part.functionResponse.name, part.functionResponse.response);
                }
            }
        }
    };
    websocket.onclose = (event: CloseEvent) => {
        clearTimeout(heartbeatTimer); // Don't leak timers

        // stop all when intentional
        if (event.code === 1000) {
            stopAudio();
            onConnectionClosed();
            return;
        } else showToast(`Connection failed. Retrying... (Attempt ${reconnectAttempts + 1}/5)`, "error");

        if (reconnectAttempts == 4) {
            clearTimeout(reconnectionTimeout);
            showToast("Connection failed after multiple attempts.", "error");
            onConnectionClosed();
            return;
        }

        // backoff strategy
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), maxReconnectDelay);
        reconnectionTimeout = setTimeout(() => {
            reconnectAttempts++;
            connectWebsocket(config, onFunctionCalled, onConnectionOpened, onConnectionClosed, showToast, onInterrupted);
        }, delay);
    };
    websocket.onerror = (_: Event) => {
        // Kill the audio immediately so the "recording" icon disappears
        stopAudio();
        showToast("Unable to connect to the server.", "error");
    };
}

export function userInitiatedClosure() {
    if (websocket) websocket.close(1000, "User requested disconnect"); // 1000 is a normal closure
}

export function sendMessage(message: string) {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        const jsonMessage = JSON.stringify({
            type: "text",
            text: message
        });
        websocket.send(jsonMessage);
    }
}

export function sendImage(base64Image: string) {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        const jsonMessage = JSON.stringify({
            type: "image",
            data: base64Image,
            mimeType: "image/jpeg"
        });
        websocket.send(jsonMessage);
    }
}

// --------------------------------------------- Handle Audio
let audioPlayerNode: AudioWorkletNode;
let micStream: MediaStream;

// Import the audio worklets
import {startAudioPlayerWorklet} from "./audio/audio-player.ts";
import {startAudioRecorderWorklet, stopMicrophone} from "./audio/audio-recorder.ts";

export function startAudio() {
    // Start audio output
    startAudioPlayerWorklet().then((res) => {
        audioPlayerNode = res.node;
    });

    // Start audio input
    startAudioRecorderWorklet(audioRecorderHandler).then((res) => {
            micStream = res.stream;
        }
    );
}

export function stopAudio() {
    stopMicrophone(micStream);
}

function audioRecorderHandler(pcmData: ArrayBuffer) {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        // Send audio as binary WebSocket frame (more efficient than base64 JSON)
        websocket.send(pcmData);
    }
}

// Decode Base64 data to Array
// Handles both standard base64 and base64url encoding
function base64ToArray(base64: string) {
    // Convert base64url to standard base64
    // Replace URL-safe characters: - with +, _ with /
    let standardBase64 = base64.replace(/-/g, '+').replace(/_/g, '/');

    // Add padding if needed
    while (standardBase64.length % 4) {
        standardBase64 += '=';
    }

    const binaryString = window.atob(standardBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

// --------------------------------------------- Utilities
async function generateBrowserId() {
    const data = {
        domain: getDomain(document.location.hostname),
        screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        hardware: navigator.hardwareConcurrency
    };

    const stream = new TextEncoder().encode(JSON.stringify(data));
    const hashBuffer = await crypto.subtle.digest('SHA-256', stream);

    // Convert buffer to hex string
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}