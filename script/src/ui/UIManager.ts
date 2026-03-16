import {ThemeConfig} from "../common/config.types.ts";

declare global {
    interface Window {
        __highlightAnimId?: number; // or 'any', but 'number' is typical for animation IDs
    }
}

export class UIManager {
    private fab: HTMLButtonElement | null = null;
    private modalOverlay: HTMLDivElement | null = null;
    private themeConfig: ThemeConfig | undefined;
    private readonly onApprove: () => void;
    private readonly onCloseConnection: () => void;

    constructor(onApprove: () => void, onCloseConnection: () => void, themeConfig?: ThemeConfig) {
        this.onApprove = onApprove;
        this.onCloseConnection = onCloseConnection;
        this.themeConfig = themeConfig;
        this.initFloatingActionButton();
    }

    private initFloatingActionButton() {
        this.fab = document.createElement('button');
        this.fab.id = 'uxiguide-fab';
        this.fab.setAttribute('aria-label', 'Open UXIGuide Assistant');
        this.fab.innerHTML = `
            <svg style="scale: 1.75;" id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" ><defs><style>.cls-1{fill:currentColor;}</style></defs><path class="cls-1" d="M129.11,240.18v41.54q-32-1.31-47.55-17.66T66,213.45v-121h55.68V215.78Q121.68,235.78,129.11,240.18Zm14.28,41.54V239.66q6.84-4.41,6.85-23.88V92.49h55.68v121q0,34-15.42,50.35T143.39,281.72Z"/><path class="cls-1" d="M255,192.16l29.41,55.55L271,279.38h-54ZM218.49,92.49h55.39l96.23,186.89H315.86Zm118.22,92.67-30-58.15,12-34.52H373Z"/><path class="cls-1" d="M388.1,92.49h55.69V279.38H388.1Z"/><path class="cls-1" d="M100.65,355.6H66q.82-20.06,7.76-32.45A42.67,42.67,0,0,1,92.65,305q12-5.78,27.47-5.78a78.56,78.56,0,0,1,12,1q6.27,1,12.87,2.29l-3,26.74c-3.63-.66-6.74-1.17-9.33-1.55a53.66,53.66,0,0,0-7.83-.57q-8.09,0-13.37,2.44a15.56,15.56,0,0,0-7.84,8.64Q101.15,344.36,100.65,355.6Zm11.88,36v27.72q-13.86-.83-24.17-6.69t-16-17.85q-5.68-12-6.35-31.06h34.65q.33,12.39,3,18.91A15.34,15.34,0,0,0,112.53,391.63Zm8.25,27.88V382.17l-9.07-22.33h38.77v52.5a39.44,39.44,0,0,1-13.12,5.13A94.33,94.33,0,0,1,120.78,419.51Z"/><path class="cls-1" d="M195.69,396.2v21.19a33.54,33.54,0,0,1-10.56,1.79q-11.38,0-18.89-7t-7.51-21v-67h29.7v62.28Q188.43,395.21,195.69,396.2Zm6.6,9.13v-81.2H232v93.75H206.75Z"/><path class="cls-1" d="M244.37,294.78h31.35V317H244.37Zm.82,29.35h29.7v93.75h-29.7Z"/><path class="cls-1" d="M325.55,323.64v22.18q-6.44.65-8.25,7.5t-1.82,19.89q0,12.87,2,18.18t7.43,5.29h.66v21a30.44,30.44,0,0,1-10.4,1.79q-9.07,0-14.93-3.83A26.6,26.6,0,0,1,291,405.16a51.89,51.89,0,0,1-4.78-15.08,106.74,106.74,0,0,1-1.41-17.69q0-26.73,8.5-38.15t24.5-11.41a31.65,31.65,0,0,1,3.8.24C322.91,323.23,324.23,323.43,325.55,323.64ZM334,299.19l29.7-4.41v123.1H338.42L334,405Z"/><path class="cls-1" d="M417.13,419.51a69.31,69.31,0,0,1-17.74-2.12,31.72,31.72,0,0,1-13.78-7.5q-5.78-5.38-8.91-14.84t-3.14-24.13q0-22.82,8.25-35t26.57-13.12v24q-3.63,5.55-3.63,23.64,0,10.6,1.65,16.31a11.53,11.53,0,0,0,6.35,7.82q4.71,2.13,13.45,2.12A48.66,48.66,0,0,0,434,396q4-.64,7.84-1.47v22.18q-5.79,1.14-12.13,2A99.85,99.85,0,0,1,417.13,419.51ZM413,380.05V362h5.44q0-3.75-.24-8a17.11,17.11,0,0,0-1.73-7V323q15.66,1.31,22.6,11.17T446,362c0,3-.11,6.17-.33,9.37a63.22,63.22,0,0,1-1.16,8.72Z"/></svg>
        `;
        this.fab.style.backgroundColor = this.themeConfig?.fabColor || "#141414";
        this.fab.style.color = this.themeConfig?.onFabColor || "#FFFFFF";

        const act = (e: any) => {
            e.stopPropagation();
            e.stopImmediatePropagation();

            if (e.type === 'click') {
                if (this.fab!.classList.contains('is-recording')) {
                    this.onCloseConnection();
                    this.stopAnimation();
                } else if (localStorage.getItem('uxiguide-consent') !== 'true') {
                    this.renderConsentModal();
                } else {
                    this.triggerMainAction();
                    this.startAnimation();
                }
            }
        };
        ['mousedown', 'pointerdown', 'click'].forEach((evt: string) => {
            this.fab!.addEventListener(evt, act, true);
        });
        this.fab.addEventListener('mousedown', e => e.preventDefault(), true);

        document.body.appendChild(this.fab);
    }

    private renderConsentModal() {
        if (this.modalOverlay) return;

        const content = [
            {
                icon: "📷",
                title: "Screen Awareness",
                description: "This allows the agent to see where you are on the page to provide accurate guidance. To protect your privacy, all sensitive data like passwords or personal details are automatically hidden before the agent sees them.",
            },
            {
                icon: "🎤",
                title: "Voice Interaction",
                description: "Enable your microphone to talk naturally with the agent and ask questions in real-time. Audio is only processed during your active session to help you navigate the site.",
            }
        ]

        this.modalOverlay = document.createElement('div');
        this.modalOverlay.className = 'uxiguide-overlay';
        this.modalOverlay.innerHTML = `
            <div class="uxiguide-modal" style="background: ${this.themeConfig?.modalColor || "#FFFFFF"}">
                <h2 style="color: ${this.themeConfig?.modalTitleColor || "#141414"}">Enable Live Assistance</h2>
                <p style="color: ${this.themeConfig?.modalBodyColor || "#666666"}">To provide real-time, step-by-step guidance, UXIGuide needs your permission to interact with your screen and voice.</p>
                
                ${content.map((c) => `
                    <div class="uxiguide-feature-row">
                        <div class="uxiguide-icon-wrapper" style="background: ${this.themeConfig?.featureIconColor || "#f5f5f5"}">${c.icon}</div>
                        <div class="uxiguide-feature-text">
                            <h3 style="color: ${this.themeConfig?.featureTitleColor || "#141414"}">${c.title}</h3>
                            <p style="color: ${this.themeConfig?.featureBodyColor || "#888888"}">${c.description}</p>
                        </div>
                    </div>
                `).join(`\n`)}
                
                <div class="uxiguide-button-group">
                    <button class="uxiguide-btn" id="uxiguide-cancel" style="background: ${this.themeConfig?.secondaryButtonColor || "#f5f5f5"}; color: ${this.themeConfig?.onSecondaryButtonColor || "#666"}">Not now</button>
                    <button class="uxiguide-btn" id="uxiguide-confirm" style="background: ${this.themeConfig?.primaryButtonColor || "#141414"}; color: ${this.themeConfig?.onPrimaryButtonColor || "#FFFFFF"}">Grant Access</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.modalOverlay);

        // Event Listeners
        document.getElementById('uxiguide-cancel')?.addEventListener('click', () => this.closeModal());
        document.getElementById('uxiguide-confirm')?.addEventListener('click', () => {
            localStorage.setItem('uxiguide-consent', 'true');
            this.triggerMainAction();
            this.closeModal();
        });
    }

    private closeModal() {
        if (this.modalOverlay) {
            this.modalOverlay.remove();
            this.modalOverlay = null;
        }
    }

    private triggerMainAction() {
        this.onApprove();
    }

    showFlash() {
        const overlay = document.createElement("div");
        overlay.className = "screenshot-flash";
        document.body.appendChild(overlay);
        overlay.classList.add('animate-flash');
        setTimeout(() => {
            overlay.classList.remove('animate-flash');
            overlay.remove();
        }, 500);
    }

    showToast(message: string, type = 'info') {
        let container = document.getElementById('uxiguide-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'uxiguide-toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `uxiguide-toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        // Trigger slide-in
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Clean up
        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => {
                toast.remove();
            });
        }, 2000);
    }

    startAnimation() {
        // Toggle the recording state
        this.fab!.classList.add('is-recording');
        this.fab!.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        `;
    }

    stopAnimation() {
        this.fab!.classList.remove('is-recording');
        this.fab!.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
        `;
    }

    listenToElement(ids: string[], callback: () => void) {
        const listener = () => {
            callback();
            this.stopHighlight();
            ids.forEach((i: string) => document.getElementById(i)?.removeEventListener("click", listener));
        }
        ids.forEach((id: string) => {
            const element = document.getElementById(id);
            if (element) {
                // Determine the category
                let category = 'click'; // Default
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.isContentEditable) {
                    category = 'input';
                }

                if (category === "click") {
                    element.addEventListener("click", listener, {once: true});
                } else {
                    const doneBtn = document.createElement('button');
                    doneBtn.id = "uxiguide-next-btn";
                    doneBtn.innerHTML = "I've Done it, What's next?";
                    doneBtn.style.backgroundColor = this.themeConfig?.nextBtnColor || "#4F46E5";
                    doneBtn.style.color = this.themeConfig?.onNextBtnColor || "#FFFFFF";
                    const blockingListener = (e: any) => {
                        e.stopPropagation();
                        e.stopImmediatePropagation();

                        callback();
                        this.stopHighlight();
                        ['mousedown', 'pointerdown', 'click'].forEach((evt: string) => {
                            doneBtn.removeEventListener(evt, blockingListener);
                        });
                        document.getElementById("uxiguide-next-btn")?.remove();
                    }
                    ['mousedown', 'pointerdown', 'click'].forEach((evt: string) => {
                        doneBtn.addEventListener(evt, blockingListener, true);
                    });
                    doneBtn.addEventListener('mousedown', e => e.preventDefault(), true);
                    document.body.appendChild(doneBtn);
                }
            }
        });
    }

    // --------------------------------------------- Go to Elements
    goToElement(id: string) {
        const element = document.getElementById(id);
        if (element) element.scrollIntoView({behavior: "smooth", block: "start"});
    }

    // --------------------------------------------- Highlighting Elements
    getOrCreateCanvas(id: string): HTMLCanvasElement {
        let canvas: HTMLCanvasElement | null = document.getElementById(`highlight-canvas-${id}`) as HTMLCanvasElement;

        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'highlight-canvas';

            // Essential styles for an overlay
            Object.assign(canvas.style, {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100vw',
                height: '100vh',
                pointerEvents: 'none', // Critical: lets users click through the highlight
                zIndex: '2147483647',   // Maximum possible z-index
                display: 'block'
            });

            document.body.appendChild(canvas);
        }

        return canvas;
    }

    highlightElement(elementIds: string[]) {
        // Cleanup any existing highlight first
        this.stopHighlight();

        elementIds.forEach((elementId: string) => {
            const canvas: HTMLCanvasElement = this.getOrCreateCanvas(elementId);
            const ctx = canvas.getContext('2d')!;

            // Fix the canvas to the viewport
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            canvas.style.position = 'fixed';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.pointerEvents = 'none';
            canvas.style.zIndex = '9999'; // Ensure it's on top

            const targetEl = document.getElementById(elementId)!;
            if (!targetEl) return;

            let animId;
            let startTime: number | null = null;

            function draw(ts: DOMHighResTimeStamp) {
                if (!startTime) startTime = ts;
                const t = (ts - startTime!) / 1000;

                // Get LIVE coordinates relative to the current viewport
                const rect = targetEl.getBoundingClientRect();
                const {left: x, top: y, width: w, height: h} = rect;
                const xMax = x + w;
                const yMax = y + h;
                const CORNER = Math.min(w, h) * 0.25;

                // Clear based on viewport size
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Soft fill
                const fillAlpha = 0.08 + 0.07 * Math.sin(t * 3);
                ctx.fillStyle = `rgba(0, 200, 255, ${fillAlpha})`;
                ctx.fillRect(x, y, w, h);

                // Animated dashed border
                const dashOffset = (t * 60) % 20;
                ctx.save();
                ctx.strokeStyle = 'rgba(0, 220, 255, 0.85)';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([8, 4]);
                ctx.lineDashOffset = -dashOffset;
                ctx.strokeRect(x, y, w, h);
                ctx.restore();

                // Pulsing corner brackets
                const pulse = 0.7 + 0.3 * Math.sin(t * 4);
                ctx.save();
                ctx.strokeStyle = `rgba(0, 255, 220, ${pulse})`;
                ctx.lineWidth = 3;

                const corners = [
                    [x, y + CORNER, x, y, x + CORNER, y],           // Top Left
                    [xMax - CORNER, y, xMax, y, xMax, y + CORNER],   // Top Right
                    [xMax, yMax - CORNER, xMax, yMax, xMax - CORNER, yMax], // Bottom Right
                    [x + CORNER, yMax, x, yMax, x, yMax - CORNER],   // Bottom Left
                ];

                for (const [x1, y1, mx, my, x2, y2] of corners) {
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(mx, my);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                }
                ctx.restore();

                animId = requestAnimationFrame(draw);
            }

            // Handle window resizing
            const handleResize = () => {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            };
            window.addEventListener('resize', handleResize);

            animId = requestAnimationFrame(draw);
            window.__highlightAnimId = animId;
        })
    }

    resizeHandler = null;

    stopHighlight() {
        const canvas = document.querySelectorAll('[id^="highlight-canvas"]');
        canvas.forEach((c) => c.remove());

        if (window.__highlightAnimId) {
            cancelAnimationFrame(window.__highlightAnimId);
        }

        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }
    }
}