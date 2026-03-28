// italic.js
feathers.register({
    id: 'italic',
    name: 'Italic',
    version: '1.1.2',
    author: 'Feathers Team',
    description: 'Forces the AI to respond in a specific language.',

    settings(api) {
        const currentLang = api.store.get('language') || 'English';
        const langs = ['English', 'Spanish', 'French', 'German', 'Italian', 'Japanese', 'Korean', 'Mandarin (Simplified)', 'Russian', 'Arabic', 'Portuguese'];

        const overlay = document.createElement('div');
        overlay.className = 'overlay visible';
        overlay.style.zIndex = '3000';
        overlay.innerHTML = `
            <div class="modal">
                <h2 class="modal-title">Language Settings</h2>
                <p class="modal-desc">Select the primary language for the AI's responses.</p>
                <div style="margin-bottom: 24px;">
                    <select id="italic-select" style="width: 100%; padding: 12px; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary);">
                        ${langs.map(l => `<option value="${l}" ${l === currentLang ? 'selected' : ''}>${l}</option>`).join('')}
                    </select>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" id="italic-cancel">Cancel</button>
                    <button class="btn-primary" id="italic-save">Save & Reload</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);

        document.getElementById('italic-cancel').onclick = () => overlay.remove();
        document.getElementById('italic-save').onclick = () => {
            api.store.set('language', document.getElementById('italic-select').value);
            overlay.remove();
            window.location.hash = 'extensions';
            window.location.reload();
        };
    },

    onLoad(api) {
        const currentLang = api.store.get('language') || 'English';
        api.ai.addBlock({
            type: 'system',
            content: 'You must respond to all prompts in the following language: ' + currentLang
        });
    }
});
