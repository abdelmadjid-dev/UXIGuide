import {domToJpeg} from 'modern-screenshot';

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