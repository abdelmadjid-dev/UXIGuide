const getInputLabel = (el: HTMLInputElement) => {
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
    return el.getAttribute('aria-label') || '';
};

const getElementLabel = (el: HTMLElement) => {
    if (!el) return null;

    // check aria-label first
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim() !== "") {
        return ariaLabel.trim();
    }

    // check title attribute
    if (el.title && el.title.trim() !== "") {
        return el.title.trim();
    }

    // fallback to innerText (the visible text)
    if (el.innerText && el.innerText.trim() !== "") {
        return el.innerText.trim();
    }

    return "";
}

export function generateUIMap(rootElement = document.body) {
    const interactiveSelectors = [
        // Elements
        'button:not([disabled])',
        'a[href]',
        'input:not([type="hidden"]):not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        'details > summary',
        '[contenteditable="true"]',
        // Focusable Non-Standard Elements
        '[tabindex]:not([tabindex^="-"]):not([disabled])',
        // ARIA
        '[role="button"]',
        '[role="link"]',
        '[role="menuitem"]',
        '[role="menuitemcheckbox"]',
        '[role="menuitemradio"]',
        '[role="tab"]',
        '[role="checkbox"]',
        '[role="radio"]',
        '[role="switch"]',
        '[role="combobox"]',
        '[role="treeitem"]',
        '[role="option"]',
        '[role="slider"]',
        '[role="spinbutton"]'
    ].join(',');

    const elements = rootElement.querySelectorAll(interactiveSelectors);

    return Array.from(elements).map((el, index) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);

        if (el.id === "uxiguide-fab") return null;

        const hasOpacityTransition = style.transitionProperty.includes('opacity') ||
            style.transitionProperty === 'all';
        const hasAnimation = style.animationName !== 'none';
        const isZeroSize = rect.width === 0 || rect.height === 0;
        const isHiddenCSS = style.display === 'none' || style.visibility === 'hidden' || (style.opacity === '0' && !hasOpacityTransition && !hasAnimation);
        const noPointer = style.pointerEvents === 'none'; // check if unclickable

        if (isZeroSize || isHiddenCSS || noPointer) return null; // skip this element
        if (!el.id) el.id = `uxiguide-id-${index}`; // define id if non-existing

        return {
            id: el.id,
            coordinates: {
                xmin: rect.left,
                xmax: rect.right,
                ymin: rect.top,
                ymax: rect.bottom
            },
            type: el.tagName.toLowerCase(),
            text: ((el instanceof HTMLInputElement && getInputLabel(el)) || (el instanceof HTMLElement && getElementLabel(el)) || '').trim(),
            ...(el.getAttribute('role') ? {role: el.getAttribute('role')} : {}),
            ...(el.getAttribute('aria-checked') ? {checked: el.getAttribute('aria-checked')} : {}),
            ...(el.getAttribute('aria-description') ? {purpose: el.getAttribute('aria-description')} : {})
        };
    }).filter(Boolean); // Remove nulls
}