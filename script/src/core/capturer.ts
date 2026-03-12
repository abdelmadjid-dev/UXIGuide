import {domToJpeg} from 'modern-screenshot';

export class UIChangesWatcher {
    private _debounceTimer: number | null = null;
    private readonly onCapture: () => void;

    constructor(onCapture: () => Promise<void>) {
        this.onCapture = onCapture;
        this._debounceTimer = null;
        this._init();
    }

    _init() {
        // SPA navigation
        const patchHistory = (method: keyof History) => {
            const original = (history[method] as Function).bind(history);
            // @ts-ignore - Necessary because we are overwriting a read-only/fixed method
            history[method] = (...args: any[]) => {
                original(...args);
                this._schedule();
            };
        };
        patchHistory('pushState');
        patchHistory('replaceState');
        window.addEventListener('popstate', () => this._schedule());
        window.addEventListener('hashchange', () => this._schedule());

        // Overlays / dialogs
        new MutationObserver((mutations) => {
            for (const {addedNodes} of mutations) {
                for (const node of addedNodes) {
                    if (this._isOverlay(node)) {
                        this._schedule(400);
                        return;
                    }
                }
            }
        }).observe(document.body, {childList: true, subtree: true});

        // Developer-flagged elements
        document.addEventListener('click', (e: PointerEvent) => {
            // TODO: update flag type & text
            const target = e.target as Element;
            if (target.closest('[uxig-ui-change-trigger]')) {
                this._schedule(500);
            }
        });
    }

    initialTrigger() {
        this._schedule();
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
            onCloneNode: (clonedDoc: any) => {
                // Find sensitive elements in the CLONED document
                const sensitiveSelectors = [
                    'input[type="password"]',
                    'input[name*="cvv"]',
                    'input[name*="cardnumber"]',
                    // TODO: change naming here
                    '[data-uxiguide-ignore]',
                    '.uxiguide-ignore',
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