export class UIChangesWatcher {
  constructor(onCapture) {
    this.onCapture = onCapture;
    this._debounceTimer = null;
    this._init();
  }

  _init() {
    // SPA navigation
    const patchHistory = (method) => {
      const original = history[method].bind(history);
      history[method] = (...args) => {
        original(...args);
        this._schedule('navigation');
      };
    };
    patchHistory('pushState');
    patchHistory('replaceState');
    window.addEventListener('popstate', () => this._schedule('navigation'));
    window.addEventListener('hashchange', () => this._schedule('navigation'));

    // Overlays / dialogs
    new MutationObserver((mutations) => {
      for (const { addedNodes } of mutations) {
        for (const node of addedNodes) {
          if (this._isOverlay(node)) {
            this._schedule('overlay-added', 400);
            return;
          }
        }
      }
    }).observe(document.body, { childList: true, subtree: true });

    // Developer-flagged elements
    document.addEventListener('click', (e) => {
      // TODO: update flag type & text
      if (e.target.closest('[uxig-ui-change-trigger]')) {
        this._schedule('flagged-click', 500);
      }
    });
  }

  initialTrigger() {
    this._schedule('first-load');
  }

  _isOverlay(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    const selectors = ['[role="dialog"]', '[aria-modal="true"]', '.modal', '.popup', '.drawer'];
    return selectors.some(s => node.matches?.(s) || node.querySelector?.(s));
  }

  // Debounce so rapid changes only fire once
  _schedule(reason, delay = 300) {
    clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => {
      this.onCapture({ reason, url: location.href, ts: Date.now() });
    }, delay);
  }
}