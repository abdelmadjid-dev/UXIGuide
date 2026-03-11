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
        ['uxig-interactive-element'], // TODO: change name
        // Elements
        'button:not([disabled])',
        'a[href]',
        'input:not([type="hidden"]):not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        'summary',
        '[contenteditable="true"]',
        // ARIA
        '[role="button"]',
        '[role="link"]',
        '[role="menuitem"]',
        '[role="tab"]',
        '[role="checkbox"]',
        '[role="radio"]',
        '[role="switch"]',
        '[role="combobox"]',
        '[role="treeitem"]',
        '[role="option"]'
    ].join(',');

    const elements = rootElement.querySelectorAll(interactiveSelectors);
    return Array.from(elements).map((el, index) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);

        const isZeroSize = rect.width === 0 || rect.height === 0;
        const isHiddenCSS = style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0';
        const noPointer = style.pointerEvents === 'none'; // check if unclickable

        if (isZeroSize || isHiddenCSS || noPointer) return null; // skip this element
        if (!el.id) el.id = `uxi-${index}`; // define id if non-existing

        return {
            id: el.id,
            type: el.tagName.toLowerCase(),
            text: ((el instanceof HTMLInputElement && getLabelText(el)) || (el instanceof HTMLElement && el.innerText) || '').trim(),
            ...(el.getAttribute('role') ? {role: el.getAttribute('role')} : {}),
            // TODO: change name
            ...(el.getAttribute('uxiguide-purpose') ? {purpose: el.getAttribute('uxiguide-purpose')} : {})
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
                    // TODO: change naming here
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

// --------------------------------------------- Go to Elements
export function goToElement(id) {
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({behavior: "smooth", block: "start"});
}

// --------------------------------------------- Highlighting Elements
function getOrCreateCanvas() {
    let canvas = document.getElementById('highlight-canvas');

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

export function highlightElement(elementId) {
    // Cleanup any existing highlight first
    stopHighlight();

    const targetEl = document.getElementById(elementId);
    const canvas = getOrCreateCanvas();
    if (!targetEl) return;

    const ctx = canvas.getContext('2d');

    // 1. Fix the canvas to the viewport
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999'; // Ensure it's on top

    let animId;
    let startTime = null;

    function draw(ts) {
        if (!startTime) startTime = ts;
        const t = (ts - startTime) / 1000;

        // 2. Get LIVE coordinates relative to the current viewport
        const rect = targetEl.getBoundingClientRect();
        const {left: x, top: y, width: w, height: h} = rect;
        const xMax = x + w;
        const yMax = y + h;
        const CORNER = Math.min(w, h) * 0.25;

        // Clear based on viewport size
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // --- 1. Soft fill ---
        const fillAlpha = 0.08 + 0.07 * Math.sin(t * 3);
        ctx.fillStyle = `rgba(0, 200, 255, ${fillAlpha})`;
        ctx.fillRect(x, y, w, h);

        // --- 2. Animated dashed border ---
        const dashOffset = (t * 60) % 20;
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 220, 255, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 4]);
        ctx.lineDashOffset = -dashOffset;
        ctx.strokeRect(x, y, w, h);
        ctx.restore();

        // --- 3. Pulsing corner brackets ---
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

let resizeHandler = null;

export function stopHighlight() {
    const canvas = document.getElementById('highlight-canvas');
    if (canvas) canvas.remove();

    if (window.__highlightAnimId) {
        cancelAnimationFrame(window.__highlightAnimId);
    }

    if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
        resizeHandler = null;
    }
}

// --------------------------------------------- Listening to Elements
export function listenToElement(id, callback) {
    const element = document.getElementById(id);
    if (element) {
        // Determine the category
        let category = 'click'; // Default
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.isContentEditable) {
            category = 'input';
        } else if (element.tagName === 'SELECT' || element.getAttribute('role') === 'combobox') {
            category = 'selection';
        }

        const listener = (_) => {
            callback();
            element.removeEventListener("click", listener);
            stopHighlight();
            document.getElementById("uxiguide-next-button")?.remove();
        }

        if (category === "click") element.addEventListener("click", listener, {once: true});
        else {
            // TODO: make button close to trigger
            const doneBtn = document.createElement('button');
            doneBtn.id = "uxiguide-next-button";
            doneBtn.innerHTML = 'DONE!'; // Or use an icon/text
            element.insertAdjacentElement("afterend", doneBtn);
            doneBtn.addEventListener('click', listener, {once: true});
        }
    }
}