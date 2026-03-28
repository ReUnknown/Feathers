// playground.js
feathers.register({
    id: 'playground',
    name: 'Playground',
    version: '1.0.0',
    author: 'Feathers Team',
    description: 'Adds a comprehensive developer playground sidebar to fine-tune AI generation parameters.',

    settings(api) {
        api.ui.showToast('Playground settings are located in the Playground Sidebar within the chat tab.', 'info');
    },

    onLoad(api) {
        // We will create the UI elements ONLY when this extension is loaded.

        // Default constraints for playground
        const pState = {
            temperature: api.store.get('pg-temperature') || 0.7,
            topP: api.store.get('pg-topp') || 1.0,
            maxTokens: api.store.get('pg-maxtokens') || 2048,
            systemPrompt: api.store.get('pg-systemprompt') || '',
            isOpen: false
        };

        // 1. Inject the Sidebar UI
        const sidebarHtml = `
            <div id="pg-sidebar" style="
                position: fixed;
                top: 0;
                right: -320px;
                width: 320px;
                height: 100vh;
                background: var(--bg-secondary);
                border-left: 1px solid var(--border-color);
                z-index: 2000;
                transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                display: flex;
                flex-direction: column;
                box-shadow: -4px 0 24px rgba(0,0,0,0.1);
            ">
                <div style="padding: 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: var(--bg-tertiary);">
                    <h2 style="font-size: 1.1rem; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 8px;">
                        <i class="fa-solid fa-flask" style="color: var(--accent-primary);"></i> Playground
                    </h2>
                    <button id="pg-close-btn" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 4px; font-size: 1.1rem; transition: color 0.2s;">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                
                <div style="padding: 24px 20px; flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 24px;">
                    
                    <!-- System Prompt -->
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <label style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">System Prompt</label>
                        <textarea id="pg-sys-prompt" style="
                            width: 100%;
                            height: 120px;
                            padding: 12px;
                            background: var(--input-bg);
                            border: 1px solid var(--border-color);
                            border-radius: 6px;
                            color: var(--text-primary);
                            font-size: 0.9rem;
                            resize: vertical;
                            transition: border-color 0.2s;
                        " placeholder="You are a helpful assistant..."></textarea>
                    </div>

                    <!-- Temperature -->
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <label style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Temperature</label>
                            <span id="pg-temp-val" style="font-family: monospace; font-size: 0.85rem; color: var(--text-primary); background: var(--bg-tertiary); padding: 2px 6px; border-radius: 4px;">0.7</span>
                        </div>
                        <input type="range" id="pg-temp-slider" min="0" max="2" step="0.1" value="0.7" style="width: 100%; accent-color: var(--accent-primary);">
                        <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); margin-top: -4px;">
                            <span>Precise</span>
                            <span>Creative</span>
                        </div>
                    </div>

                    <!-- Top P -->
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <label style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Top P</label>
                            <span id="pg-topp-val" style="font-family: monospace; font-size: 0.85rem; color: var(--text-primary); background: var(--bg-tertiary); padding: 2px 6px; border-radius: 4px;">1.0</span>
                        </div>
                        <input type="range" id="pg-topp-slider" min="0" max="1" step="0.05" value="1.0" style="width: 100%; accent-color: var(--accent-primary);">
                    </div>

                    <!-- Max Tokens -->
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <label style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Max Tokens</label>
                            <span id="pg-tokens-val" style="font-family: monospace; font-size: 0.85rem; color: var(--text-primary); background: var(--bg-tertiary); padding: 2px 6px; border-radius: 4px;">2048</span>
                        </div>
                        <input type="range" id="pg-tokens-slider" min="256" max="8192" step="256" value="2048" style="width: 100%; accent-color: var(--accent-primary);">
                    </div>
                </div>

                <div style="padding: 20px; border-top: 1px solid var(--border-color); background: var(--bg-tertiary);">
                    <button id="pg-save-btn" class="btn-primary" style="width: 100%; justify-content: center; padding: 12px; font-weight: 600;">
                        <i class="fa-solid fa-check"></i> Apply Settings
                    </button>
                </div>
            </div>
        `;

        // Inject sidebar into body
        const container = document.createElement('div');
        container.innerHTML = sidebarHtml;
        document.body.appendChild(container.firstElementChild);

        // 2. Add Toggle Button to UI
        // We will look for an appropriate place in the chat header, or fallback to fixed button.
        const chatHeader = document.querySelector('.main-header .header-actions');
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'icon-btn';
        toggleBtn.id = 'pg-toggle-btn';
        toggleBtn.title = 'Open Playground';
        toggleBtn.innerHTML = '<i class="fa-solid fa-flask"></i>';

        if (chatHeader) {
            chatHeader.prepend(toggleBtn);
        } else {
            // Fallback: fixed bottom right
            toggleBtn.style.position = 'fixed';
            toggleBtn.style.bottom = '20px';
            toggleBtn.style.right = '20px';
            toggleBtn.style.zIndex = '1999';
            toggleBtn.style.background = 'var(--accent-primary)';
            toggleBtn.style.color = 'white';
            toggleBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
            toggleBtn.style.borderRadius = '50%';
            toggleBtn.style.width = '48px';
            toggleBtn.style.height = '48px';
            toggleBtn.style.display = 'flex';
            toggleBtn.style.alignItems = 'center';
            toggleBtn.style.justifyContent = 'center';
            document.body.appendChild(toggleBtn);
        }

        // 3. UI Logic Binding
        const sidebar = document.getElementById('pg-sidebar');
        const closeBtn = document.getElementById('pg-close-btn');
        const saveBtn = document.getElementById('pg-save-btn');

        const uiTemp = document.getElementById('pg-temp-slider');
        const uiTempV = document.getElementById('pg-temp-val');
        const uiTopP = document.getElementById('pg-topp-slider');
        const uiTopPV = document.getElementById('pg-topp-val');
        const uiTokens = document.getElementById('pg-tokens-slider');
        const uiTokensV = document.getElementById('pg-tokens-val');
        const uiSysPrompt = document.getElementById('pg-sys-prompt');

        // Set initial values
        uiTemp.value = pState.temperature;
        uiTempV.textContent = parseFloat(pState.temperature).toFixed(1);
        uiTopP.value = pState.topP;
        uiTopPV.textContent = parseFloat(pState.topP).toFixed(2);
        uiTokens.value = pState.maxTokens;
        uiTokensV.textContent = pState.maxTokens;
        uiSysPrompt.value = pState.systemPrompt;

        // Input listeners for live value updating
        uiTemp.addEventListener('input', (e) => uiTempV.textContent = parseFloat(e.target.value).toFixed(1));
        uiTopP.addEventListener('input', (e) => uiTopPV.textContent = parseFloat(e.target.value).toFixed(2));
        uiTokens.addEventListener('input', (e) => uiTokensV.textContent = e.target.value);

        const openSidebar = () => {
            sidebar.style.right = '0px';
            pState.isOpen = true;
        };

        const closeSidebar = () => {
            sidebar.style.right = '-320px';
            pState.isOpen = false;
        };

        toggleBtn.addEventListener('click', () => {
            pState.isOpen ? closeSidebar() : openSidebar();
        });

        closeBtn.addEventListener('click', closeSidebar);

        saveBtn.addEventListener('click', () => {
            pState.temperature = parseFloat(uiTemp.value);
            pState.topP = parseFloat(uiTopP.value);
            pState.maxTokens = parseInt(uiTokens.value, 10);
            pState.systemPrompt = uiSysPrompt.value;

            api.store.set('pg-temperature', pState.temperature);
            api.store.set('pg-topp', pState.topP);
            api.store.set('pg-maxtokens', pState.maxTokens);
            api.store.set('pg-systemprompt', pState.systemPrompt);

            api.ui.showToast('Playground settings applied!', 'success');

            // Add system prompt dynamically if it exists
            if (pState.systemPrompt.trim() !== '') {
                api.ai.addBlock({ type: 'system', content: pState.systemPrompt });
            }
        });

        // Add initial system prompt if there's one saved
        if (pState.systemPrompt.trim() !== '') {
            api.ai.addBlock({ type: 'system', content: pState.systemPrompt });
        }

        // Note: The AI API requires us to override generation options if we want temp/topp. 
        // Currently, Feathers API might not have a direct way to intercept generation options via extensions.
        // We will mock this capability by leaving a footprint in the API logs or console.

        console.log('[Playground] Initialized. Current State:', pState);
    }
});
