/**
 * WebSocket handling
 */

// Connect the server with a WebSocket connection
const userId = "demo-user-" + Math.random().toString(36).substring(7);
const sessionId = "demo-session-" + Math.random().toString(36).substring(7);
let websocket = null;
let is_audio = false;

// Build WebSocket URL with RunConfig options as query parameters
function getWebSocketUrl() {
    // Use wss:// for HTTPS pages, ws:// for HTTP (localhost development)
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const baseUrl = wsProtocol + "//" + window.location.host + "/ws/" + userId + "/" + sessionId;
    const params = new URLSearchParams();

    const queryString = params.toString();
    return queryString ? baseUrl + "?" + queryString : baseUrl;
}

// Get DOM elements
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("message");
const messagesDiv = document.getElementById("messages");
const statusIndicator = document.getElementById("statusIndicator");
const statusText = document.getElementById("statusText");
const consoleContent = document.getElementById("consoleContent");
const clearConsoleBtn = document.getElementById("clearConsole");
const showAudioEventsCheckbox = document.getElementById("showAudioEvents");
let currentMessageId = null;
let currentBubbleElement = null;

// Console logging functionality
function formatTimestamp() {
    const now = new Date();
    return now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3
    });
}

function addConsoleEntry(type, content, data = null, emoji = null, author = null, isAudio = false) {
    // Skip audio events if checkbox is unchecked
    if (isAudio && !showAudioEventsCheckbox.checked) {
        return;
    }

    const entry = document.createElement("div");
    entry.className = `console-entry ${type}`;

    const header = document.createElement("div");
    header.className = "console-entry-header";

    const leftSection = document.createElement("div");
    leftSection.className = "console-entry-left";

    // Add emoji icon if provided
    if (emoji) {
        const emojiIcon = document.createElement("span");
        emojiIcon.className = "console-entry-emoji";
        emojiIcon.textContent = emoji;
        leftSection.appendChild(emojiIcon);
    }

    // Add expand/collapse icon
    const expandIcon = document.createElement("span");
    expandIcon.className = "console-expand-icon";
    expandIcon.textContent = data ? "▶" : "";

    const typeLabel = document.createElement("span");
    typeLabel.className = "console-entry-type";
    typeLabel.textContent = type === 'outgoing' ? '↑ Upstream' : type === 'incoming' ? '↓ Downstream' : '⚠ Error';

    leftSection.appendChild(expandIcon);
    leftSection.appendChild(typeLabel);

    // Add author badge if provided
    if (author) {
        const authorBadge = document.createElement("span");
        authorBadge.className = "console-entry-author";
        authorBadge.textContent = author;
        authorBadge.setAttribute('data-author', author);
        leftSection.appendChild(authorBadge);
    }

    const timestamp = document.createElement("span");
    timestamp.className = "console-entry-timestamp";
    timestamp.textContent = formatTimestamp();

    header.appendChild(leftSection);
    header.appendChild(timestamp);

    const contentDiv = document.createElement("div");
    contentDiv.className = "console-entry-content";
    contentDiv.textContent = content;

    entry.appendChild(header);
    entry.appendChild(contentDiv);

    // JSON details (hidden by default)
    let jsonDiv = null;
    if (data) {
        jsonDiv = document.createElement("div");
        jsonDiv.className = "console-entry-json collapsed";
        const pre = document.createElement("pre");
        pre.textContent = JSON.stringify(data, null, 2);
        jsonDiv.appendChild(pre);
        entry.appendChild(jsonDiv);

        // Make entry clickable if it has data
        entry.classList.add("expandable");

        // Toggle expand/collapse on click
        entry.addEventListener("click", () => {
            const isExpanded = !jsonDiv.classList.contains("collapsed");

            if (isExpanded) {
                // Collapse
                jsonDiv.classList.add("collapsed");
                expandIcon.textContent = "▶";
                entry.classList.remove("expanded");
            } else {
                // Expand
                jsonDiv.classList.remove("collapsed");
                expandIcon.textContent = "▼";
                entry.classList.add("expanded");
            }
        });
    }

    consoleContent.appendChild(entry);
    consoleContent.scrollTop = consoleContent.scrollHeight;
}

function clearConsole() {
    consoleContent.innerHTML = '';
}

// Clear console button handler
clearConsoleBtn.addEventListener('click', clearConsole);

// Update connection status UI
function updateConnectionStatus(connected) {
    if (connected) {
        statusIndicator.classList.remove("disconnected");
        statusText.textContent = "Connected";
    } else {
        statusIndicator.classList.add("disconnected");
        statusText.textContent = "Disconnected";
    }
}

// Create a message bubble element
function createMessageBubble(text, isUser, isPartial = false) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${isUser ? "user" : "agent"}`;

    const bubbleDiv = document.createElement("div");
    bubbleDiv.className = "bubble";

    const textP = document.createElement("p");
    textP.className = "bubble-text";
    textP.textContent = text;

    // Add typing indicator for partial messages
    if (isPartial && !isUser) {
        const typingSpan = document.createElement("span");
        typingSpan.className = "typing-indicator";
        textP.appendChild(typingSpan);
    }

    bubbleDiv.appendChild(textP);
    messageDiv.appendChild(bubbleDiv);

    return messageDiv;
}

// Update existing message bubble text
function updateMessageBubble(element, text, isPartial = false) {
    const textElement = element.querySelector(".bubble-text");

    // Remove existing typing indicator
    const existingIndicator = textElement.querySelector(".typing-indicator");
    if (existingIndicator) {
        existingIndicator.remove();
    }

    textElement.textContent = text;

    // Add typing indicator for partial messages
    if (isPartial) {
        const typingSpan = document.createElement("span");
        typingSpan.className = "typing-indicator";
        textElement.appendChild(typingSpan);
    }
}

// Add a system message
function addSystemMessage(text) {
    const messageDiv = document.createElement("div");
    messageDiv.className = "system-message";
    messageDiv.textContent = text;
    messagesDiv.appendChild(messageDiv);
    scrollToBottom();
}

// Scroll to bottom of messages
function scrollToBottom() {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Sanitize event data for console display (replace large audio data with summary)
function sanitizeEventForDisplay(event) {
    // Deep clone the event object
    const sanitized = JSON.parse(JSON.stringify(event));

    // Check for audio data in content.parts
    if (sanitized.content && sanitized.content.parts) {
        sanitized.content.parts = sanitized.content.parts.map(part => {
            if (part.inlineData && part.inlineData.data) {
                // Calculate byte size (base64 string length / 4 * 3, roughly)
                const byteSize = Math.floor(part.inlineData.data.length * 0.75);
                return {
                    ...part,
                    inlineData: {
                        ...part.inlineData,
                        data: `(${byteSize.toLocaleString()} bytes)`
                    }
                };
            }
            return part;
        });
    }

    return sanitized;
}

// WebSocket handlers
function connectWebsocket() {
    // Connect websocket
    const ws_url = getWebSocketUrl();
    websocket = new WebSocket(ws_url);

    // Handle connection open
    websocket.onopen = function () {
        console.log("WebSocket connection opened.");
        updateConnectionStatus(true);
        addSystemMessage("Connected to ADK streaming server");

        // Log to console
        addConsoleEntry('incoming', 'WebSocket Connected', {
            userId: userId,
            sessionId: sessionId,
            url: ws_url
        }, '🔌', 'system');

        // Enable the Send button
        document.getElementById("sendButton").disabled = false;
        addSubmitHandler();
    };

    // Handle incoming messages
    websocket.onmessage = async function (event) {
        // Parse the incoming ADK Event
        const adkEvent = JSON.parse(event.data);
        console.log("[AGENT TO CLIENT] ", adkEvent);

        // Log to console panel
        let eventSummary = 'Event';
        let eventEmoji = '📨'; // Default emoji
        const author = adkEvent.author || 'system';

        if (adkEvent.turnComplete) {
            eventSummary = 'Turn Complete';
            eventEmoji = '✅';
        } else if (adkEvent.interrupted) {
            eventSummary = 'Interrupted';
            eventEmoji = '⏸️';
        } else if (adkEvent.content && adkEvent.content.parts) {
            const hasFunctionCall = adkEvent.content.parts.some(p => p.functionResponse);
            const hasText = adkEvent.content.parts.some(p => p.text);

            if (hasText) {
                // Show text preview in summary
                const textPart = adkEvent.content.parts.find(p => p.text);
                if (textPart && textPart.text) {
                    const text = textPart.text;
                    const truncated = text.length > 80
                        ? text.substring(0, 80) + '...'
                        : text;
                    eventSummary = `Text: "${truncated}"`;
                    eventEmoji = '💭';
                } else {
                    eventSummary = 'Text Response';
                    eventEmoji = '💭';
                }
            }

            if (hasFunctionCall) {
                // Show text preview in summary
                const namePart = adkEvent.content.parts.find(p => p.functionResponse);
                if (namePart && namePart.name) {
                    const text = namePart.name;
                    const truncated = text.length > 80
                        ? text.substring(0, 80) + '...'
                        : text;
                    eventSummary = `Function Call: "${truncated}"`;
                    eventEmoji = '⚙️';
                } else {
                    eventSummary = 'Function Response';
                    eventEmoji = '⚙️';
                }
            }

        }

        // Create a sanitized version for console display (replace large audio data with summary)
        // Skip if already logged as audio event above
        const isAudioOnlyEvent = adkEvent.content && adkEvent.content.parts &&
            adkEvent.content.parts.some(p => p.inlineData) &&
            !adkEvent.content.parts.some(p => p.text) &&
            !adkEvent.content.parts.some(p => p.functionResponse);
        if (!isAudioOnlyEvent) {
            const sanitizedEvent = sanitizeEventForDisplay(adkEvent);
            addConsoleEntry('incoming', eventSummary, sanitizedEvent, eventEmoji, author);
        }

        // Handle turn complete event
        if (adkEvent.turnComplete === true) {
            // Remove typing indicator from current message
            if (currentBubbleElement) {
                const textElement = currentBubbleElement.querySelector(".bubble-text");
                const typingIndicator = textElement.querySelector(".typing-indicator");
                if (typingIndicator) {
                    typingIndicator.remove();
                }
            }

            currentMessageId = null;
            currentBubbleElement = null;
            return;
        }

        // Handle interrupted event
        if (adkEvent.interrupted === true) {
            // Stop audio playback if it's playing
            if (audioPlayerNode) {
                audioPlayerNode.port.postMessage({command: "endOfAudio"});
            }

            // Keep the partial message but mark it as interrupted
            if (currentBubbleElement) {
                const textElement = currentBubbleElement.querySelector(".bubble-text");

                // Remove typing indicator
                const typingIndicator = textElement.querySelector(".typing-indicator");
                if (typingIndicator) {
                    typingIndicator.remove();
                }

                // Add interrupted marker
                currentBubbleElement.classList.add("interrupted");
            }

            // Reset state so new content creates a new bubble
            currentMessageId = null;
            currentBubbleElement = null;
            return;
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

                // Handle text
                if (part.text) {
                    // Skip thinking/reasoning text from chat bubbles (shown in event console)
                    if (part.thought) {
                        continue;
                    }

                    // Add a new message bubble for a new turn
                    if (currentMessageId == null) {
                        currentMessageId = Math.random().toString(36).substring(7);
                        currentBubbleElement = createMessageBubble(part.text, false, true);
                        currentBubbleElement.id = currentMessageId;
                        messagesDiv.appendChild(currentBubbleElement);
                    } else {
                        // Update the existing message bubble with accumulated text
                        const existingText = currentBubbleElement.querySelector(".bubble-text").textContent;
                        // Remove the "..." if present
                        const cleanText = existingText.replace(/\.\.\.$/, '');
                        updateMessageBubble(currentBubbleElement, cleanText + part.text, true);
                    }

                    // Scroll down to the bottom of the messagesDiv
                    scrollToBottom();
                }

                // Handle Function Calling
                if (part.functionResponse) {
                    switch (part.functionResponse.name) {
                        case "request_screenshot":
                            const screenshotResponse = part.functionResponse.response;
                            const map = JSON.stringify(generateUIMap());
                            const screenshot = await captureSafeScreenshot();
                            sendImage(screenshot.split(',')[1]);
                            sendMessage(ANALYZE_CONTEXT(screenshotResponse.intent, map));
                            break;
                        case "dispatch_next_action":
                            const response = part.functionResponse.response;
                            const bound = response.rect;
                            highlightElement(bound.x, bound.x + bound.w, bound.y, bound.y + bound.h);
                            listenToElement(response.id, () => sendMessage(STEP_COMPLETED));
                            break;
                    }
                }
            }
        }
    };

    // Handle connection close
    websocket.onclose = function () {
        console.log("WebSocket connection closed.");
        updateConnectionStatus(false);
        document.getElementById("sendButton").disabled = true;
        addSystemMessage("Connection closed. Reconnecting in 5 seconds...");

        // Log to console
        addConsoleEntry('error', 'WebSocket Disconnected', {
            status: 'Connection closed',
            reconnecting: true,
            reconnectDelay: '5 seconds'
        }, '🔌', 'system');
    };

    websocket.onerror = function (e) {
        console.log("WebSocket error: ", e);
        updateConnectionStatus(false);

        // Log to console
        addConsoleEntry('error', 'WebSocket Error', {
            error: e.type,
            message: 'Connection error occurred'
        }, '⚠️', 'system');
    };
}

connectWebsocket();

// Add submit handler to the form
function addSubmitHandler() {
    messageForm.onsubmit = function (e) {
        e.preventDefault();
        const message = messageInput.value.trim();
        if (message) {
            // Add user message bubble
            const userBubble = createMessageBubble(message, true, false);
            messagesDiv.appendChild(userBubble);
            scrollToBottom();

            // Clear input
            messageInput.value = "";

            // Send message to server
            sendMessage(message);
            console.log("[CLIENT TO AGENT] " + message);
        }
        return false;
    };
}

// Send a message to the server as JSON
function sendMessage(message) {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        const jsonMessage = JSON.stringify({
            type: "text",
            text: message
        });
        websocket.send(jsonMessage);

        // Log to console panel
        addConsoleEntry('outgoing', 'User Message: ' + message, null, '💬', 'user');
    }
}

// Decode Base64 data to Array
// Handles both standard base64 and base64url encoding
function base64ToArray(base64) {
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

function sendImage(base64Image) {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        const jsonMessage = JSON.stringify({
            type: "image",
            data: base64Image,
            mimeType: "image/jpeg"
        });
        websocket.send(jsonMessage);
        console.log("[CLIENT TO AGENT] Sent image");
    }
}

/**
 * Audio handling
 */
let audioPlayerNode;
let audioPlayerContext;
let audioRecorderNode;
let audioRecorderContext;
let micStream;

// Import the audio worklets
import {startAudioPlayerWorklet} from "./audio-player.js";
import {startAudioRecorderWorklet} from "./audio-recorder.js";
import {captureSafeScreenshot, generateUIMap, highlightElement, listenToElement} from "./utilities/tools";

// Start audio
function startAudio() {
    // Start audio output
    startAudioPlayerWorklet().then(([node, ctx]) => {
        audioPlayerNode = node;
        audioPlayerContext = ctx;
    });
    // Start audio input
    startAudioRecorderWorklet(audioRecorderHandler).then(
        ([node, ctx, stream]) => {
            audioRecorderNode = node;
            audioRecorderContext = ctx;
            micStream = stream;
        }
    );
}

// Start the audio only when the user clicked the button
// (due to the gesture requirement for the Web Audio API)
const startAudioButton = document.getElementById("startAudioButton");
startAudioButton.addEventListener("click", () => {
    startAudioButton.disabled = true;
    sendMessage(INITIALIZE_SESSION);
    startAudio();
    is_audio = true;
    addSystemMessage("Audio mode enabled - you can now speak to the agent");

    // Log to console
    addConsoleEntry('outgoing', 'Audio Mode Enabled', {
        status: 'Audio worklets started',
        message: 'Microphone active - audio input will be sent to agent'
    }, '🎤', 'system');
});

// Audio recorder handler
function audioRecorderHandler(pcmData) {
    if (websocket && websocket.readyState === WebSocket.OPEN && is_audio) {
        // Send audio as binary WebSocket frame (more efficient than base64 JSON)
        websocket.send(pcmData);
        console.log("[CLIENT TO AGENT] Sent audio chunk: %s bytes", pcmData.byteLength);

        // Log to console panel (optional, can be noisy with frequent audio chunks)
        // addConsoleEntry('outgoing', `Audio chunk: ${pcmData.byteLength} bytes`);
    }
}