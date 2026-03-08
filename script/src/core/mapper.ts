export function generateUIMap(rootElement = document.body) {
    const interactiveSelectors = [
        'button', 'a', 'input', 'select', 'textarea', // TODO: add label with a twist
        '[role="button"]', '[role="link"]', '[role="menuitem"]', '[role="tab"]', // ARIA
        '[onclick]', // Legacy JS clicks
        '.btn', '.button', '.clickable' // Common CSS utility classes (optional but helpful)
    ].join(',');

    const elements = rootElement.querySelectorAll(interactiveSelectors);
    const vWidth = window.innerWidth;
    const vHeight = window.innerHeight;

    return Array.from(elements).map((el, index) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);

        const isZeroSize = rect.width === 0 || rect.height === 0;
        const isHiddenCSS = style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0';
        const isOffScreen = rect.bottom < 0 || rect.top > vHeight || rect.right < 0 || rect.left > vWidth;

        if (isZeroSize || isHiddenCSS) {
            return null; // Skip this element
        }

        if (!el.id) {
            el.id = `uxi-${index}`;
        }

        return {
            id: el.id,
            type: el.tagName.toLowerCase(),
            role: el.getAttribute('role') || 'none',
            text: ((el instanceof HTMLElement && el.innerText) || el.getAttribute('aria-label') || (el instanceof HTMLInputElement && el.placeholder) || '').trim().substring(0, 50),
            // Normalized Coordinates (0-1000)
            rect: {
                x: Math.round((rect.left / vWidth) * 1000),
                y: Math.round((rect.top / vHeight) * 1000),
                w: Math.round((rect.width / vWidth) * 1000),
                h: Math.round((rect.height / vHeight) * 1000)
            },
            isVisible: !isOffScreen // Let the AI know if it needs to tell the user to scroll
        };
    }).filter(Boolean); // Remove nulls
}

export function testHighlightElement(xmin: number, xmax: number, ymin: number, ymax: number, clear: boolean = false) {
    const canvas: HTMLCanvasElement = document.getElementById('canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!!;

    const docHeight = document.documentElement.scrollHeight;
    const docWidth = document.documentElement.scrollWidth;

    if (canvas.height !== docHeight || canvas.width !== docWidth) {
        canvas.width = docWidth;
        canvas.height = docHeight;
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.pointerEvents = 'none'; // So user can still click buttons underneath
    }

    if (clear) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(255, 0, 0, 0.15)';

    const newXMin = (xmin / 1000) * window.innerWidth;
    const newYMin = (ymin / 1000) * window.innerHeight + window.scrollY;
    const newXMax = (xmax / 1000) * window.innerWidth;
    const newYMax = (ymax / 1000) * window.innerHeight + window.scrollY;

    ctx.fillRect(newXMin, newYMin, newXMax - newXMin, newYMax - newYMin);
    ctx.strokeRect(newXMin, newYMin, newXMax - newXMin, newYMax - newYMin);
}