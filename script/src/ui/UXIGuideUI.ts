export class UXIGuideUI {
    private fab: HTMLButtonElement | null = null;
    private modalOverlay: HTMLDivElement | null = null;
    private readonly onApprove: () => void;

    constructor(onApprove: () => void) {
        this.onApprove = onApprove;
        this.initFloatingActionButton();
    }

    private initFloatingActionButton() {
        this.fab = document.createElement('button');
        this.fab.className = 'uxig-fab';
        this.fab.setAttribute('aria-label', 'Open Assistant');
        this.fab.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
        `;

        this.fab.onclick = () => {
            if (localStorage.getItem('uxig-consent') !== 'true') {
                this.renderConsentModal();
            } else {
                this.triggerMainAction();
            }
        };

        document.body.appendChild(this.fab);
    }

    private renderConsentModal() {
        if (this.modalOverlay) return;

        this.modalOverlay = document.createElement('div');
        this.modalOverlay.className = 'uxig-overlay';
        this.modalOverlay.innerHTML = `
            <div class="uxig-modal">
                <h2>Permissions Required</h2>
                <p>This script needs the following permissions to provide assistance.</p>
                
                <div class="uxig-feature-row">
                    <div class="uxig-icon-wrapper">📸</div>
                    <div class="uxig-feature-text">
                        <h3>Visual Context</h3>
                        <p>Allows the AI to see the page structure for better guidance.</p>
                    </div>
                </div>
                
                <div class="uxig-feature-row">
                    <div class="uxig-icon-wrapper">🪄</div>
                    <div class="uxig-feature-text">
                        <h3>Interactive Assistance</h3>
                        <p>Enables highlighting and animations to guide your workflow.</p>
                    </div>
                </div>
                
                <div class="uxig-button-group">
                    <button class="uxig-btn uxig-btn-secondary" id="uxig-cancel">Not now</button>
                    <button class="uxig-btn uxig-btn-primary" id="uxig-confirm">Grant Access</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.modalOverlay);

        // Event Listeners
        document.getElementById('uxig-cancel')?.addEventListener('click', () => this.closeModal());
        document.getElementById('uxig-confirm')?.addEventListener('click', () => {
            localStorage.setItem('uxig-consent', 'true');
            this.triggerMainAction();
            this.closeModal();
        });
    }

    private closeModal() {
        if (this.modalOverlay) {
            this.modalOverlay.remove();
            this.modalOverlay = null;
        }
    }

    private triggerMainAction() {
        console.log('UXIGuide: Running main assistant logic...');
        this.onApprove();
    }

    callAction() {
        console.log("Action on Interface")
    }
}
