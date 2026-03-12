declare global {
    interface Window {
        __highlightAnimId?: number; // or 'any', but 'number' is typical for animation IDs
    }
}

export class UXIGuideUI {
    private fab: HTMLButtonElement | null = null;
    private modalOverlay: HTMLDivElement | null = null;
    private readonly onApprove: () => void;
    private readonly onCloseConnection: () => void;

    constructor(onApprove: () => void, onCloseConnection: () => void) {
        this.onApprove = onApprove;
        this.onCloseConnection = onCloseConnection;
        this.initFloatingActionButton();
    }

    private initFloatingActionButton() {
        this.fab = document.createElement('button');
        this.fab.className = 'uxiguide-fab';
        this.fab.setAttribute('aria-label', 'Open UXIGuide Assistant');
        this.fab.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
        `;

        this.fab.onclick = () => {
            if (this.fab!.classList.contains('is-recording')) {
                this.onCloseConnection();
                this.stopAnimation();
            } else if (localStorage.getItem('uxiguide-consent') !== 'true') {
                this.renderConsentModal();
            } else {
                this.triggerMainAction();
                this.startAnimation();
            }
        };

        document.body.appendChild(this.fab);
    }

    private renderConsentModal() {
        if (this.modalOverlay) return;

        this.modalOverlay = document.createElement('div');
        this.modalOverlay.className = 'uxiguide-overlay';
        this.modalOverlay.innerHTML = `
            <div class="uxiguide-modal">
                <h2>Permissions Required</h2>
                <p>This script needs the following permissions to provide assistance.</p>
                
                <div class="uxiguide-feature-row">
                    <div class="uxiguide-icon-wrapper">📸</div>
                    <div class="uxiguide-feature-text">
                        <h3>Visual Context</h3>
                        <p>Allows the AI to see the page structure for better guidance.</p>
                    </div>
                </div>
                
                <div class="uxiguide-feature-row">
                    <div class="uxiguide-icon-wrapper">🪄</div>
                    <div class="uxiguide-feature-text">
                        <h3>Interactive Assistance</h3>
                        <p>Enables highlighting and animations to guide your workflow.</p>
                    </div>
                </div>
                
                <div class="uxiguide-button-group">
                    <button class="uxiguide-btn uxiguide-btn-secondary" id="uxiguide-cancel">Not now</button>
                    <button class="uxiguide-btn uxiguide-btn-primary" id="uxiguide-confirm">Grant Access</button>
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

    listenToElement(id: string, callback: () => void) {
        const element = document.getElementById(id);
        if (element) {
            // Determine the category
            let category = 'click'; // Default
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.isContentEditable) {
                category = 'input';
            } else if (element.tagName === 'SELECT' || element.getAttribute('role') === 'combobox') {
                category = 'selection';
            }

            const listener = (_: any) => {
                callback();
                this.stopHighlight();
                element.removeEventListener("click", listener);
                document.getElementById("uxiguide-next-btn")?.remove();
            }

            if (category === "click") element.addEventListener("click", listener, {once: true});
            else {
                const doneBtn = document.createElement('button');
                doneBtn.id = "uxiguide-next-btn";
                doneBtn.innerHTML = "I've Done it, What's next?";
                doneBtn.addEventListener('click', listener, {once: true});
                document.body.appendChild(doneBtn);
            }
        }
    }

    // --------------------------------------------- Go to Elements
    goToElement(id: string) {
        const element = document.getElementById(id);
        if (element) element.scrollIntoView({behavior: "smooth", block: "start"});
    }

    // --------------------------------------------- Highlighting Elements
    getOrCreateCanvas(): HTMLCanvasElement {
        let canvas: HTMLCanvasElement | null = document.getElementById('highlight-canvas') as HTMLCanvasElement;

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

    highlightElement(elementId: string) {
        // Cleanup any existing highlight first
        this.stopHighlight();

        const targetEl = document.getElementById(elementId)!;
        const canvas: HTMLCanvasElement = this.getOrCreateCanvas();
        if (!targetEl) return;

        const ctx = canvas.getContext('2d')!;

        // Fix the canvas to the viewport
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '9999'; // Ensure it's on top

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
    }

    resizeHandler = null;

    stopHighlight() {
        const canvas = document.getElementById('highlight-canvas');
        if (canvas) canvas.remove();

        if (window.__highlightAnimId) {
            cancelAnimationFrame(window.__highlightAnimId);
        }

        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }
    }
}
