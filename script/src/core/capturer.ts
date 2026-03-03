import html2canvas from "html2canvas";

export async function captureSafeScreenshot(rootElement = document.body) {
    try {
        const canvas = await html2canvas(rootElement, {
            useCORS: true, // allows images from other domains to be drawn
            allowTaint: false, // prevents the canvas from being "polluted" by cross-origin data
            logging: false, // Keep the console clean for the user
            backgroundColor: null, // Keep transparency if needed
            imageTimeout: 5000, // Wait up to 5s for external assets to load
            onclone: (clonedDoc) => {
                // TODO: add other specific selectors like customized ones (e.g. [data-uxiguide-ignore], .px-private)
                // Find sensitive elements in the CLONED document
                const sensitiveSelectors = 'input[type="password"], .px-private';
                const elementsToRedact = clonedDoc.querySelectorAll(sensitiveSelectors);

                elementsToRedact.forEach(el => {
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

        // Convert to base64 for Gemini 3 "Brain" Agent (0.8 to save bandwidth)
        return canvas.toDataURL('image/jpeg', 0.8);
    } catch (error) {
        console.error("UXIGuide Capture Error:", error);
        throw error;
    }
}