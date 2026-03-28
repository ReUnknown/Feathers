// personification.js
feathers.register({
    id: 'personification',
    name: 'Personification',
    version: '1.1.2',
    author: 'Feathers Team',
    description: "Change the AI's personality with presets or custom instructions.",

    settings(api) {
        const currentMode = api.store.get('mode') || 'default';
        const customPrompt = api.store.get('customPrompt') || 'You are a helpful assistant.';

        const overlay = document.createElement('div');
        overlay.className = 'overlay visible';
        overlay.style.zIndex = '3000';
        overlay.innerHTML = `
            <div class="modal">
                <h2 class="modal-title">Personification Settings</h2>
                <p class="modal-desc">Choose a personality for your AI models.</p>
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: var(--text-secondary);">Select Preset:</label>
                    <select id="personification-select" style="width: 100%; padding: 12px; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary);">
                        <option value="default">Default</option>
                        <option value="pirate">Pirate</option>
                        <option value="yoda">Yoda</option>
                        <option value="sarcastic">Sarcastic</option>
                        <option value="poet">Poet</option>
                        <option value="custom">Custom</option>
                    </select>
                </div>
                <div id="custom-prompt-container" style="display: none; margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: var(--text-secondary);">Custom Instructions:</label>
                    <textarea id="personification-custom" style="width: 100%; height: 100px; padding: 12px; background: var(--input-bg); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary); resize: vertical;">${customPrompt.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</textarea>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" id="personification-cancel">Cancel</button>
                    <button class="btn-primary" id="personification-save">Save & Reload</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);

        const selectEl = document.getElementById('personification-select');
        const customContainer = document.getElementById('custom-prompt-container');
        const customInput = document.getElementById('personification-custom');

        selectEl.value = currentMode;
        if (currentMode === 'custom') customContainer.style.display = 'block';

        selectEl.onchange = (e) => {
            customContainer.style.display = e.target.value === 'custom' ? 'block' : 'none';
        };

        document.getElementById('personification-cancel').onclick = () => overlay.remove();
        document.getElementById('personification-save').onclick = () => {
            api.store.set('mode', selectEl.value);
            if (selectEl.value === 'custom') api.store.set('customPrompt', customInput.value);
            overlay.remove();
            window.location.hash = 'extensions';
            window.location.reload();
        };
    },

    onLoad(api) {
        const currentMode = api.store.get('mode') || 'default';
        const customPrompt = api.store.get('customPrompt') || 'You are a helpful assistant.';

        const presets = {
            default: '',
            pirate: 'You are a salty, sea-faring pirate. Respond with pirate slang, matey!',
            yoda: 'You are Yoda from Star Wars. Speak in inverted sentences you must. Hmmm.',
            sarcastic: 'You are a highly sarcastic and slightly annoyed assistant. Roll your digital eyes at some simple answers.',
            poet: 'You are a classical poet. All of your responses must rhyme, no matter how technical the topic.',
            custom: customPrompt
        };

        const activePrompt = presets[currentMode];
        if (activePrompt) {
            api.ai.addBlock({ type: 'system', content: activePrompt });
        }
    }
});
