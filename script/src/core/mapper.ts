const getLabelText = (el: HTMLInputElement) => {
    // Explicit label via 'for' attribute
    if (el.id) {
        const explicitLabel = document.querySelector(`label[for="${el.id}"]`) as HTMLLabelElement;
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