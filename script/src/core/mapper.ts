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