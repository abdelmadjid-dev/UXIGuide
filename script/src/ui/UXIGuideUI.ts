export class UXIGuideUI {
    private fab: HTMLButtonElement | null = null;
    private modalOverlay: HTMLDivElement | null = null;
    private readonly onApprove: () => void;

    constructor(onApprove: () => void) {
        this.onApprove = onApprove;
        this.initFloatingActionButton();
    }

    private initFloatingActionButton() {
        this.fab = document.createElement('button');
        this.fab.className = 'uxiguide-fab';
        this.fab.setAttribute('aria-label', 'Open Assistant');
        this.fab.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
        `;

        this.fab.onclick = () => {
            if (localStorage.getItem('uxiguide-consent') !== 'true') {
                this.renderConsentModal();
            } else {
                this.triggerMainAction();
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
        console.log('UXIGuide: Running main assistant logic...');
        this.onApprove();
    }

    showScreenshotToast(message = "Screenshot taken! 📸") {
        let container = document.getElementById('uxiguide-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'uxiguide-toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = 'uxiguide-toast';
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
        const overlay = document.createElement("div");
        overlay.className = "uxiguide-overlay-border";
        document.body.appendChild(overlay);

        // Toggle the recording state
        this.fab!.classList.toggle('is-recording');
        this.fab!.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"></circle></svg>`;
    }

    stopAnimation() {
        const overlaysByClass = document.getElementsByClassName("sixqs-overlay-border");
        if (overlaysByClass.length > 0) document.body.removeChild(overlaysByClass[0]);

        this.fab!.classList.toggle('is-recording');
        this.fab!.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
    }

    highlightElement(xmin: number, xmax: number, ymin: number, ymax: number) {
        const canvas = document.getElementById('canvas') as HTMLCanvasElement;
        const ctx = canvas.getContext('2d')!;

        const docHeight = document.documentElement.scrollHeight;
        const docWidth = document.documentElement.scrollWidth;

        if (canvas.height !== docHeight || canvas.width !== docWidth) {
            canvas.width = docWidth;
            canvas.height = docHeight;
            canvas.style.position = 'absolute';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.pointerEvents = 'none';
        }

        const newXMin = (xmin / 1000) * window.innerWidth;
        const newYMin = (ymin / 1000) * window.innerHeight + window.scrollY;
        const newXMax = (xmax / 1000) * window.innerWidth;
        const newYMax = (ymax / 1000) * window.innerHeight + window.scrollY;
        const w = newXMax - newXMin;
        const h = newYMax - newYMin;

        let animId: number;
        let startTime: number | null = null;
        const CORNER = Math.min(w, h) * 0.25; // corner bracket length

        function draw(ts: number) {
            if (!startTime) startTime = ts;
            const t = (ts - startTime) / 1000; // seconds elapsed

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // --- 1. Soft fill, pulsing opacity ---
            const fillAlpha = 0.08 + 0.07 * Math.sin(t * 3);
            ctx.fillStyle = `rgba(0, 200, 255, ${fillAlpha})`;
            ctx.fillRect(newXMin, newYMin, w, h);

            // --- 2. Animated dashed border ---
            const dashOffset = (t * 60) % 20;
            ctx.save();
            ctx.strokeStyle = 'rgba(0, 220, 255, 0.85)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([8, 4]);
            ctx.lineDashOffset = -dashOffset;
            ctx.shadowColor = 'rgba(0, 220, 255, 0.9)';
            ctx.shadowBlur = 8;
            ctx.strokeRect(newXMin, newYMin, w, h);
            ctx.restore();

            // --- 3. Pulsing corner brackets ---
            const pulse = 0.7 + 0.3 * Math.sin(t * 4);
            ctx.save();
            ctx.strokeStyle = `rgba(0, 255, 220, ${pulse})`;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.shadowColor = 'rgba(0, 255, 180, 1)';
            ctx.shadowBlur = 12 + 6 * Math.sin(t * 4);
            ctx.setLineDash([]);

            const corners = [
                // [startX, startY, endX1, endY1, endX2, endY2]
                [newXMin, newYMin + CORNER, newXMin, newYMin, newXMin + CORNER, newYMin],
                [newXMax - CORNER, newYMin, newXMax, newYMin, newXMax, newYMin + CORNER],
                [newXMax, newYMax - CORNER, newXMax, newYMax, newXMax - CORNER, newYMax],
                [newXMin + CORNER, newYMax, newXMin, newYMax, newXMin, newYMax - CORNER],
            ];

            for (const [x1, y1, mx, my, x2, y2] of corners) {
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(mx, my);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
            ctx.restore();

            // --- 4. Shimmer sweep ---
            const sweepX = newXMin + (w * ((t * 0.6) % 1.4) - w * 0.2);
            const grad = ctx.createLinearGradient(sweepX - 40, 0, sweepX + 40, 0);
            grad.addColorStop(0, 'rgba(255,255,255,0)');
            grad.addColorStop(0.5, 'rgba(255,255,255,0.12)');
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(newXMin, newYMin, w, h);

            animId = requestAnimationFrame(draw);
        }

        this.stopHighlightAnimation(); // cancel any previous
        animId = requestAnimationFrame(draw);

        // Store cancel handle globally so `clear` can stop it
        (window as any).__highlightAnimId = animId;
        (window as any).__stopHighlight = () => {
            cancelAnimationFrame((window as any).__highlightAnimId);
        };
    }

    private stopHighlightAnimation() {
        (window as any).__stopHighlight?.();
    }
}
