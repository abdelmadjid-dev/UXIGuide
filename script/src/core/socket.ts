let websocket: WebSocket | null = null;

// Build WebSocket URL with RunConfig options as query parameters
function getWebSocketUrl(userId: string, sessionId: string) {
    // Use wss:// for HTTPS pages, ws:// for HTTP (localhost development)
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const baseUrl = wsProtocol + "//" + "localhost:8080" + "/ws/" + userId + "/" + sessionId;
    const params = new URLSearchParams();

    const queryString = params.toString();
    return queryString ? baseUrl + "?" + queryString : baseUrl;
}

export function connectWebsocket(
    onFunctionCalled: (name: string, response: any) => void,
    onclose: () => void,
    onError: (event: Event) => void,
) {
    // Connect websocket - TODO: define both userId and sessionId
    const userId = "demo-user";
    const sessionId = "demo-session-" + Math.random().toString(36).substring(7);
    const ws_url = getWebSocketUrl(userId, sessionId);
    websocket = new WebSocket(ws_url);

    //websocket.onopen = onOpen;
    websocket.onmessage = function (event) {
        // Parse the incoming ADK Event
        const adkEvent = JSON.parse(event.data);

        // TODO: Handle turn complete event
        if (adkEvent.turnComplete === true) {

        }

        // TODO: Handle interrupted event
        if (adkEvent.interrupted === true) {

        }

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
    websocket.onclose = onclose;
    websocket.onerror = onError;
}

export function closeWebsocket() {
    websocket?.close();
}

export function sendMessage(message: string) {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        console.log(`Sending Text Message: ${message.substring(0, 30)}`);
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