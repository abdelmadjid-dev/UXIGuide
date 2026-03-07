export class InterfaceManager {
    private fab: HTMLButtonElement | null = null;
    private dialog: HTMLDivElement | null = null;
    private onApprove: () => void;

    constructor(onApprove: () => void) {
        this.onApprove = onApprove;
        this.injectStyles();
        this.createFAB();
    }

    private injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .uxi-fab {
                position: fixed;
                bottom: 32px;
                right: 32px;
                width: 64px;
                height: 64px;
                background: #141414;
                color: white;
                border-radius: 50%;
                border: none;
                cursor: pointer;
                box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: transform 0.2s;
            }
            .uxi-fab:hover { transform: scale(1.1); }
            .uxi-fab svg { width: 24px; height: 24px; }
            
            .uxi-dialog-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,0.4);
                backdrop-filter: blur(4px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                padding: 20px;
            }
            .uxi-dialog {
                background: white;
                border-radius: 24px;
                padding: 32px;
                max-width: 400px;
                width: 100%;
                box-shadow: 0 20px 40px rgba(0,0,0,0.15);
                font-family: sans-serif;
            }
            .uxi-dialog h2 { margin: 0 0 16px; font-size: 20px; color: #141414; }
            .uxi-dialog p { margin: 0 0 24px; font-size: 14px; color: #666; line-height: 1.5; }
            .uxi-permission-item { display: flex; gap: 16px; margin-bottom: 24px; }
            .uxi-permission-icon { width: 40px; height: 40px; background: #f5f5f5; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
            .uxi-permission-text h3 { margin: 0 0 4px; font-size: 14px; color: #141414; }
            .uxi-permission-text p { margin: 0; font-size: 12px; color: #888; }
            .uxi-actions { display: flex; gap: 12px; }
            .uxi-btn { flex: 1; padding: 12px; border-radius: 12px; border: none; font-weight: 600; cursor: pointer; font-size: 14px; }
            .uxi-btn-refuse { background: #f5f5f5; color: #666; }
            .uxi-btn-approve { background: #141414; color: white; }
        `;
        document.head.appendChild(style);
    }

    private createFAB() {
        this.fab = document.createElement('button');
        this.fab.className = 'uxi-fab';
        this.fab.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
        `;
        this.fab.onclick = () => {
            if (localStorage.getItem('consentApproved') !== 'true') {
                this.showConsentDialog();
            } else {
                console.log('UXIGuide: Assistant active');
                this.onApprove();
            }
        };
        document.body.appendChild(this.fab);
    }

    private showConsentDialog() {
        if (this.dialog) return;

        this.dialog = document.createElement('div');
        this.dialog.className = 'uxi-dialog-overlay';
        this.dialog.innerHTML = `
            <div class="uxi-dialog">
                <h2>Permissions Required</h2>
                <p>This script needs the following permissions to provide assistance.</p>
                
                <div class="uxi-permission-item">
                    <div class="uxi-permission-icon">📸</div>
                    <div class="uxi-permission-text">
                        <h3>Screenshot Access</h3>
                        <p>Necessary for AI to see what you see. Sensitive data will be redacted.</p>
                    </div>
                </div>
                
                <div class="uxi-permission-item">
                    <div class="uxi-permission-icon">🎤</div>
                    <div class="uxi-permission-text">
                        <h3>Audio Access</h3>
                        <p>Required for voice interaction and real-time guidance.</p>
                    </div>
                </div>
                
                <div class="uxi-actions">
                    <button class="uxi-btn uxi-btn-refuse" id="uxi-refuse">Refuse</button>
                    <button class="uxi-btn uxi-btn-approve" id="uxi-approve">Approve</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.dialog);

        document.getElementById('uxi-refuse')?.addEventListener('click', () => {
            this.dialog?.remove();
            this.dialog = null;
        });

        document.getElementById('uxi-approve')?.addEventListener('click', () => {
            localStorage.setItem('consentApproved', 'true');
            this.onApprove();
            this.dialog?.remove();
            this.dialog = null;
        });
    }

    callAction() {
        console.log("Action on Interface")
    }
}
