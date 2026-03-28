feathers.register({
    id: 'deepsearch', // required, lowercase, no spaces [cite: 4]
    name: 'Deep Search', // [cite: 4]
    version: '2.0.0', // [cite: 4]
    author: 'Feathers Team', // [cite: 4]
    description: 'Highlight text to instantly run a deep AI research query in a side panel.', // [cite: 4]

    // -------------------------------------------------------
    // SETTINGS PANEL
    // -------------------------------------------------------
    settings(api) { // [cite: 4]
        // Fetch current settings or apply defaults
        const currentLength = api.store.get('ds-length') || 'Medium (2-3 paragraphs)'; // [cite: 29]
        const currentTone = api.store.get('ds-tone') || 'Academic & Professional'; // [cite: 29]
        const currentLang = api.store.get('ds-lang') || 'Same as source'; // [cite: 29]
        const currentTerms = api.store.get('ds-terms') === 'true'; // [cite: 29]

        // Build a modal overlay easily 
        api.ui.createModal({ // 
            title: 'Deep Search Settings', // 
            icon: 'fa-gear', // 
            contentHtml: `
                <div style="display: flex; flex-direction: column; gap: 20px; color: var(--text);">
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <label style="font-size: 0.9rem; font-weight: 600; color: var(--text-secondary);">Default Response Length</label>
                        <select id="ds-set-length" style="padding: 10px; border-radius: 6px; background: var(--bg-tertiary); color: var(--text); border: 1px solid var(--border-color); font-size: 0.95rem;">
                            <option value="Short (1 paragraph)" ${currentLength === 'Short (1 paragraph)' ? 'selected' : ''}>Short (1 paragraph)</option>
                            <option value="Medium (2-3 paragraphs)" ${currentLength === 'Medium (2-3 paragraphs)' ? 'selected' : ''}>Medium (2-3 paragraphs)</option>
                            <option value="Long (4-6 paragraphs)" ${currentLength === 'Long (4-6 paragraphs)' ? 'selected' : ''}>Long (4-6 paragraphs)</option>
                        </select>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <label style="font-size: 0.9rem; font-weight: 600; color: var(--text-secondary);">Research Tone</label>
                        <select id="ds-set-tone" style="padding: 10px; border-radius: 6px; background: var(--bg-tertiary); color: var(--text); border: 1px solid var(--border-color); font-size: 0.95rem;">
                            <option value="Academic & Professional" ${currentTone === 'Academic & Professional' ? 'selected' : ''}>Academic & Professional</option>
                            <option value="Casual & Accessible" ${currentTone === 'Casual & Accessible' ? 'selected' : ''}>Casual & Accessible</option>
                            <option value="Critical Skeptic (Devil's Advocate)" ${currentTone === "Critical Skeptic (Devil's Advocate)" ? 'selected' : ''}>Critical Skeptic (Devil's Advocate)</option>
                        </select>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <label style="font-size: 0.9rem; font-weight: 600; color: var(--text-secondary);">Target Language</label>
                        <input type="text" id="ds-set-lang" value="${currentLang}" placeholder="e.g., Same as source, Spanish, French..." style="padding: 10px; border-radius: 6px; background: var(--bg-tertiary); color: var(--text); border: 1px solid var(--border-color); font-size: 0.95rem;">
                    </div>

                    <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; background: var(--bg-secondary); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                        <input type="checkbox" id="ds-set-terms" ${currentTerms ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--accent-primary);">
                        <div style="display: flex; flex-direction: column;">
                            <span style="font-weight: 600; font-size: 0.95rem;">Suggest Search Terms</span>
                            <span style="font-size: 0.8rem; color: var(--text-muted);">Append a list of Google-able terms to continue researching.</span>
                        </div>
                    </label>
                </div>
            `,
            saveText: 'Save & Reload', // 
            cancelText: 'Cancel', // 
            onSave: () => { // 
                // Grab values
                const lengthVal = document.getElementById('ds-set-length').value;
                const toneVal = document.getElementById('ds-set-tone').value;
                const langVal = document.getElementById('ds-set-lang').value;
                const termsVal = document.getElementById('ds-set-terms').checked;

                // Save to extension store [cite: 6, 29]
                api.store.set('ds-length', lengthVal);
                api.store.set('ds-tone', toneVal);
                api.store.set('ds-lang', langVal || 'Same as source');
                api.store.set('ds-terms', termsVal ? 'true' : 'false');

                api.ui.showToast('Settings saved!', 'success'); // [cite: 6]
                window.location.hash = 'extensions'; // [cite: 6]
                window.location.reload(); // [cite: 6]
            },
            onCancel: () => { } // [cite: 6]
        }); // [cite: 6]
    }, // [cite: 7]

    onLoad(api) { // [cite: 8]
        // -------------------------------------------------------
        // 1. INJECT SIDEBAR & TOOLTIP DOM ELEMENTS
        // -------------------------------------------------------

        // Tooltip Button
        const tooltipBtn = document.createElement('button');
        tooltipBtn.id = 'ds-tooltip-btn';
        tooltipBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Deep Research';
        Object.assign(tooltipBtn.style, {
            position: 'absolute', display: 'none', zIndex: '9999', background: 'var(--accent-primary)',
            color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px',
            fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)', transform: 'translate(-50%, -100%)',
            marginTop: '-10px', gap: '8px', alignItems: 'center'
        });
        document.body.appendChild(tooltipBtn);

        // Sidebar Panel
        const sidebar = document.createElement('div');
        sidebar.id = 'ds-sidebar';
        Object.assign(sidebar.style, {
            position: 'fixed', top: '0', right: '-450px', width: '450px', height: '100vh',
            background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-color)',
            zIndex: '2000', transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 32px rgba(0,0,0,0.15)'
        });

        sidebar.innerHTML = `
            <div style="padding: 24px 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: var(--bg-tertiary);">
                <h2 style="font-size: 1.2rem; font-weight: 600; margin: 0; color: var(--text); display: flex; align-items: center; gap: 10px;">
                    <i class="fa-solid fa-book-open" style="color: var(--accent-primary);"></i> Deep Research
                </h2>
                <button id="ds-close-btn" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 1.2rem; transition: color 0.2s;">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            
            <div id="ds-content-area" style="padding: 24px 20px; flex: 1; overflow-y: auto; color: var(--text); font-size: 0.95rem; line-height: 1.6;">
                <p style="color: var(--text-muted); text-align: center; margin-top: 40px; font-style: italic;">Highlight text in the chat to begin researching.</p>
            </div>

            <div id="ds-action-area" style="padding: 20px; border-top: 1px solid var(--border-color); background: var(--bg-tertiary); display: none; flex-direction: column; gap: 10px;">
                <p style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; margin: 0 0 4px 0; letter-spacing: 0.5px;">Follow-up Actions</p>
                <div style="display: flex; gap: 10px;">
                    <button id="ds-opt-depth" class="btn-primary" style="flex: 1; justify-content: center; padding: 10px;">Go Deeper</button>
                    <button id="ds-opt-simplify" class="btn-secondary" style="flex: 1; justify-content: center; padding: 10px;">ELI5</button>
                </div>
                <button id="ds-opt-examples" class="btn-secondary" style="width: 100%; justify-content: center; padding: 10px;">Provide Real-World Examples</button>
            </div>
        `;
        document.body.appendChild(sidebar);

        // State & DOM References
        let currentText = '';
        const closeBtn = document.getElementById('ds-close-btn');
        const contentArea = document.getElementById('ds-content-area');
        const actionArea = document.getElementById('ds-action-area');

        const btnDepth = document.getElementById('ds-opt-depth');
        const btnSimplify = document.getElementById('ds-opt-simplify');
        const btnExamples = document.getElementById('ds-opt-examples');

        // -------------------------------------------------------
        // 2. HIGHLIGHT DETECTION LOGIC
        // -------------------------------------------------------
        const handleSelection = () => {
            const selection = window.getSelection();
            const text = selection.toString().trim();

            if (text.length > 0) {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();

                tooltipBtn.style.top = `${rect.top + window.scrollY}px`;
                tooltipBtn.style.left = `${rect.left + window.scrollX + (rect.width / 2)}px`;
                tooltipBtn.style.display = 'flex';
                currentText = text;
            } else {
                setTimeout(() => {
                    if (window.getSelection().toString().trim() === '') {
                        tooltipBtn.style.display = 'none';
                    }
                }, 100);
            }
        };

        document.addEventListener('selectionchange', handleSelection);

        // -------------------------------------------------------
        // 3. AI GENERATION LOGIC
        // Generate responses quietly in the background using the user's active AI provider [cite: 11]
        // -------------------------------------------------------
        async function runResearch(promptType, contextText) {
            sidebar.style.right = '0px';
            tooltipBtn.style.display = 'none';
            actionArea.style.display = 'none';

            contentArea.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-secondary);">
                    <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 2.5rem; color: var(--accent-primary); margin-bottom: 20px;"></i>
                    <p style="font-weight: 600;">Digging into the archives...</p>
                </div>
            `;

            // Load Preferences
            const prefLength = api.store.get('ds-length') || 'Medium (2-3 paragraphs)'; // [cite: 29]
            const prefTone = api.store.get('ds-tone') || 'Academic & Professional'; // [cite: 29]
            const prefLang = api.store.get('ds-lang') || 'Same as source'; // [cite: 29]
            const prefTerms = api.store.get('ds-terms') === 'true'; // [cite: 29]

            // Construct System Prompt dynamically
            let systemPrompt = `You are an expert researcher. Provide detailed, well-formatted information using clean HTML tags (<h1>, <h3>, <p>, <ul>, <li>, <strong>). Do not use markdown backticks.\n\n`;
            systemPrompt += `- Tone: ${prefTone}\n`;
            systemPrompt += `- Output Language: ${prefLang}\n`;

            if (prefTerms) {
                systemPrompt += `- At the very end of your response, append an HTML <ul> list titled "<h3>Suggested Search Terms</h3>" containing 3 highly relevant terms the user could Google to learn more.\n`;
            }

            // Construct User Prompt dynamically
            let userPrompt = '';
            if (promptType === 'initial') {
                userPrompt = `Please provide an explanation and analysis of the following text. Make it roughly ${prefLength} in length:\n\n"${contextText}"`;
            } else if (promptType === 'depth') {
                userPrompt = `Please go into extreme technical depth and provide advanced details about the following concept. Do not simplify it:\n\n"${contextText}"`;
            } else if (promptType === 'simplify') {
                userPrompt = `Please ignore previous length constraints and explain the following concept extremely simply, as if I were a 5-year-old child:\n\n"${contextText}"`;
            } else if (promptType === 'examples') {
                userPrompt = `Please ignore previous length constraints and provide 2 to 3 concrete, real-world examples or use cases for the following concept:\n\n"${contextText}"`;
            }

            try {
                api.ui.showToast('Compiling research...', 'info');

                // api.ai.generate(systemPrompt, userPrompt) [cite: 13]
                const response = await api.ai.generate(systemPrompt, userPrompt); // [cite: 13]

                contentArea.innerHTML = `
                    <div style="background: var(--bg-tertiary); padding: 16px; border-radius: 8px; border-left: 4px solid var(--accent-primary); margin-bottom: 24px;">
                        <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Source Text</span>
                        <p style="margin: 8px 0 0 0; font-style: italic; color: var(--text-secondary);">"${contextText}"</p>
                    </div>
                    ${response}
                `;

                actionArea.style.display = 'flex';

            } catch (err) {
                api.ui.showToast('Error: ' + err.message, 'error'); // [cite: 15]
                contentArea.innerHTML = `
                    <div style="background: rgba(255, 107, 107, 0.1); border: 1px solid #ff6b6b; padding: 20px; border-radius: 8px;">
                        <h3 style="color: #ff6b6b; margin-top: 0;"><i class="fa-solid fa-triangle-exclamation"></i> Research Failed</h3>
                        <p style="color: var(--text); margin-bottom: 0;">${err.message}</p>
                    </div>
                `;
            }
        }

        // -------------------------------------------------------
        // 4. EVENT LISTENERS
        // -------------------------------------------------------
        tooltipBtn.addEventListener('click', () => {
            runResearch('initial', currentText);
        });

        closeBtn.addEventListener('click', () => {
            sidebar.style.right = '-450px';
            // Wait for animation to finish before clearing
            setTimeout(() => {
                contentArea.innerHTML = `<p style="color: var(--text-muted); text-align: center; margin-top: 40px; font-style: italic;">Highlight text in the chat to begin researching.</p>`;
                actionArea.style.display = 'none';
            }, 300);
        });

        // Close sidebar if user clicks outside of it
        document.addEventListener('click', (e) => {
            if (sidebar.style.right === '0px' && !sidebar.contains(e.target) && e.target.id !== 'ds-tooltip-btn') {
                sidebar.style.right = '-450px';
            }
        });

        btnDepth.addEventListener('click', () => runResearch('depth', currentText));
        btnSimplify.addEventListener('click', () => runResearch('simplify', currentText));
        btnExamples.addEventListener('click', () => runResearch('examples', currentText));

        // Save reference for cleanup
        this._handleSelection = handleSelection;
    },

    // OPTIONAL: onUnload(api) [cite: 30]
    // Clean up DOM listeners or timers you created in onLoad. [cite: 31]
    onUnload(api) { // [cite: 32]
        const tooltip = document.getElementById('ds-tooltip-btn');
        const sidebar = document.getElementById('ds-sidebar');
        if (tooltip) tooltip.remove();
        if (sidebar) sidebar.remove();

        if (this._handleSelection) {
            document.removeEventListener('selectionchange', this._handleSelection);
        }

        console.log('Deep Search extension unloaded'); // [cite: 32]
    }
});