import {domToJpeg} from 'modern-screenshot';

export class UIChangesWatcher {
    private _debounceTimer: number | null = null;
    private readonly onCapture: () => void;
    // Observers
    private _originalPushState = history.pushState;
    private _originalReplaceState = history.replaceState;
    private _popstateHandler = () => this._schedule();
    private _hashchangeHandler = () => this._schedule();
    private _observer: MutationObserver | null = null;
    private _flaggedElementsObserver = (e: PointerEvent) => {
        const drasticChangeSelectors = [
            '[aria-haspopup]',
            '[aria-controls]',
            '[aria-expanded]',
            '[role="combobox"]',
            '[role="tab"]'
        ].join(',');

        const target = e.target as Element;
        if (target.closest(drasticChangeSelectors)) {
            this._schedule(500);
        }
    }

    constructor(onCapture: () => Promise<void>) {
        this.onCapture = onCapture;
        this._debounceTimer = null;
    }

    initialTrigger() {
        // SPA navigation
        history.pushState = (...args) => {
            this._originalPushState.apply(history, args);
            this._schedule();
        };

        history.replaceState = (...args) => {
            this._originalReplaceState.apply(history, args);
            this._schedule();
        };
        window.addEventListener('popstate', this._popstateHandler);
        window.addEventListener('hashchange', this._hashchangeHandler);

        // overlays / dialogs
        this._observer = new MutationObserver((mutations) => {
            for (const {addedNodes} of mutations) {
                for (const node of addedNodes) {
                    if (this._isOverlay(node)) {
                        this._schedule(400);
                        return;
                    }
                }
            }
        });
        this._observer.observe(document.body, {childList: true, subtree: true});

        // developer-flagged elements
        document.addEventListener('pointerdown', this._flaggedElementsObserver);

        // start first trigger
        this._schedule();
    }

    stopObserving() {
        // restore original methods
        history.pushState = this._originalPushState;
        history.replaceState = this._originalReplaceState;

        window.removeEventListener('popstate', this._popstateHandler);
        window.removeEventListener('hashchange', this._hashchangeHandler);

        // remove observer
        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }

        // remove flagged elements
        document.removeEventListener('pointerdown', this._flaggedElementsObserver);
    }

    _isOverlay(node: Node) {
        if (!(node instanceof Element)) return false;
        const selectors = ['[role="dialog"]', '[aria-modal="true"]', '.modal', '.popup', '.drawer'];
        return selectors.some(s => node.matches?.(s) || node.querySelector?.(s));
    }

    // Debounce so rapid changes only fire once
    _schedule(delay = 300) {
        clearTimeout(this._debounceTimer!);
        this._debounceTimer = setTimeout(() => {
            this.onCapture();
        }, delay);
    }
}

function removeOverflows(root: HTMLElement): () => void {
    const affected: Array<{ el: HTMLElement; overflow: string; overflowY: string; overflowX: string }> = [];

    root.querySelectorAll<HTMLElement>('*').forEach(el => {
        const computed = window.getComputedStyle(el);
        const hasOverflow = ['auto', 'scroll', 'hidden'].some(v =>
            computed.overflow === v || computed.overflowY === v || computed.overflowX === v
        );

        if (hasOverflow) {
            affected.push({
                el,
                overflow: el.style.overflow,
                overflowY: el.style.overflowY,
                overflowX: el.style.overflowX,
            });
            el.style.overflow = 'visible';
            el.style.overflowY = 'visible';
            el.style.overflowX = 'visible';
        }
    });

    return () => affected.forEach(({el, overflow, overflowY, overflowX}) => {
        el.style.overflow = overflow;
        el.style.overflowY = overflowY;
        el.style.overflowX = overflowX;
    });
}

export async function captureSafeScreenshot(rootElement = document.body) {
    try {
        const restoreOverflows = removeOverflows(rootElement);
        const canvas = await domToJpeg(rootElement, {
            quality: 0.8,
            timeout: 5000, // Wait up to 5s for external assets to load
            backgroundColor: null, // Keep transparency if needed
            scale: window.devicePixelRatio,
            width: rootElement.scrollWidth,
            height: rootElement.scrollHeight,
            filter: (node: any) => node.id !== 'uxiguide-fab',
            onCloneNode: (clonedDoc: any) => {
                // Find sensitive elements in the CLONED document
                const sensitiveSelectors = [
                    'input[type="password"]',
                    'input[name*="cvv"]',
                    'input[name*="cardnumber"]',
                    '[aria-hidden="true"]',
                    'iframe',
                    '.cookie-banner',
                    '#intercom-container'
                ].join(', ');
                const elementsToRedact = clonedDoc.querySelectorAll(sensitiveSelectors);

                elementsToRedact.forEach((el: any) => {
                    const htmlEl = el as HTMLElement
                    // apply the "Black Bar" style
                    htmlEl.style.backgroundColor = 'black';
                    htmlEl.style.color = 'black'; // Hide text color
                    htmlEl.style.border = 'none';

                    // For extra redaction
                    if (htmlEl instanceof HTMLInputElement) {
                        htmlEl.value = '';
                        // Ensure it looks like a solid block
                        htmlEl.style.appearance = 'none';
                        htmlEl.style.minHeight = '20px';
                    } else {
                        // For paragraphs/divs, obscure the text
                        htmlEl.innerText = 'REDACTED!';
                    }
                });
            }
        });
        restoreOverflows();
        return canvas;
    } catch (error) {
        console.error("UXIGuide Capture Error:", error);
        throw error;
    }
}