import {domToJpeg} from "https://cdn.jsdelivr.net/npm/modern-screenshot@4.6.8/+esm";

// --------------------------------------------- Generating UI Map
const getLabelText = (el) => {
    // Explicit label via 'for' attribute
    if (el.id) {
        const explicitLabel = document.querySelector(`label[for="${el.id}"]`);
        if (explicitLabel && explicitLabel.innerText.trim()) {
            return explicitLabel.innerText.trim();
        }
    }

    // Implicit label (input inside <label>)
    const parentLabel = el.closest('label');
    if (parentLabel && parentLabel.innerText.trim()) return parentLabel.innerText.trim();

    // ARIA labels (labelledby links to another element's ID)
    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
        const labelEl = document.getElementById(labelledBy);
        if (labelEl) return labelEl.innerText.trim();
    }

    // fallbacks
    return el.getAttribute('aria-label') || el.placeholder || '';
};

export function generateUIMap(rootElement = document.body) {
    const interactiveSelectors = [
        'button', 'a', 'input', 'select', 'textarea',
        // ARIA
        '[role="button"]', '[role="link"]', '[role="menuitem"]', '[role="tab"]',
        '[role="checkbox"]', '[role="radio"]', '[role="switch"]', '[role="combobox"]',
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
        const noPointer = style.pointerEvents === 'none'; // check if unclickable
        const isOffScreen = rect.bottom < 0 || rect.top > vHeight || rect.right < 0 || rect.left > vWidth;

        if (isZeroSize || isHiddenCSS || noPointer) return null; // skip this element
        if (!el.id) el.id = `uxi-${index}`; // define id if non-existing

        return {
            id: el.id,
            type: el.tagName.toLowerCase(),
            role: el.getAttribute('role') || 'none',
            text: ((el instanceof HTMLInputElement && getLabelText(el)) || (el instanceof HTMLElement && el.innerText) || '').trim(),
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

// --------------------------------------------- Capturing Screenshot
function removeOverflows(root) {
    const affected = [];

    root.querySelectorAll('*').forEach(el => {
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
            onCloneNode: (clonedDoc) => {
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

                elementsToRedact.forEach((el) => {
                    const htmlEl = el
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

// --------------------------------------------- Highlighting Elements
function stopHighlightAnimation() {
    window.__stopHighlight?.();
}

export function highlightElement(xmin, xmax, ymin, ymax) {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

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

    let animId;
    let startTime = null;
    const CORNER = Math.min(w, h) * 0.25; // corner bracket length

    function draw(ts) {
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

    stopHighlightAnimation(); // cancel any previous
    animId = requestAnimationFrame(draw);

    // Store cancel handle globally so `clear` can stop it
    window.__highlightAnimId = animId;
    window.__stopHighlight = () => {
        cancelAnimationFrame(window.__highlightAnimId);
    };
}

// --------------------------------------------- Listening to Elements
export function listenToElement(id, callback) {
    const element = document.getElementById(id);
    if (element) {
        const listener = (_) => {
            callback();
            element.removeEventListener("click", listener);
            document.getElementById("uxiguide-next-button")?.remove();
        }

        if (element?.tagName !== "INPUT") element.addEventListener("click", listener);
        else {
            const doneBtn = document.createElement('button');
            doneBtn.id = "uxiguide-next-button";
            doneBtn.innerHTML = 'DONE!'; // Or use an icon/text
            element.insertAdjacentElement("afterend", doneBtn);
            doneBtn.addEventListener('click', listener);
        }
    }
}