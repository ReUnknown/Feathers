document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');

    // Sidebars
    const mainSidebar = document.getElementById('main-sidebar');
    const mainSidebarToggle = document.getElementById('main-sidebar-toggle');
    const chatSidebar = document.getElementById('chat-sidebar');
    const chatSidebarToggle = document.getElementById('chat-sidebar-toggle');
    const toggleChatSidebarBtn = document.getElementById('toggle-chat-sidebar-btn');

    // Chat UI
    const newChatBtn = document.getElementById('new-chat-btn');
    const emptyNewChatBtn = document.getElementById('empty-new-chat-btn');
    const chatList = document.getElementById('chat-list');
    const noChatSelected = document.getElementById('no-chat-selected');
    const activeChatContainer = document.getElementById('active-chat-container');
    const activeChatTitle = document.getElementById('active-chat-title');
    const chatMessages = document.getElementById('chat-messages');
    const chatInputForm = document.getElementById('chat-input-form');
    const chatInputField = document.getElementById('chat-input-field');

    const chatOptionsBtn = document.getElementById('chat-options-btn');
    const chatDropdown = document.getElementById('chat-dropdown');
    const deleteChatOpt = document.getElementById('delete-chat-opt');
    const renameChatOpt = document.getElementById('rename-chat-opt');

    // Settings & API
    const manageApiBtn = document.getElementById('manage-api-btn');
    const apiManagerOverlay = document.getElementById('api-manager-overlay');
    const providerOptions = document.querySelectorAll('.provider-option');
    const apiKeyInput = document.getElementById('api-key-input');
    const saveApiConfigBtn = document.getElementById('save-api-config');
    const currentProviderSpan = document.querySelector('#current-provider-text span');
    const currentModelSpan = document.querySelector('#current-model-text span');
    const apiKeyMasked = document.getElementById('api-key-masked');
    const modelIdInput = document.getElementById('model-id-input');

    // Modals
    const confirmModal = document.getElementById('confirm-modal');
    const confirmTitle = document.getElementById('confirm-title');
    const confirmDesc = document.getElementById('confirm-desc');
    const confirmProceed = document.getElementById('confirm-proceed');
    const confirmCancel = document.getElementById('confirm-cancel');

    const archiveOverlay = document.getElementById('archive-overlay');
    const openArchiveBtn = document.getElementById('open-archive-btn');
    const archiveListContainer = document.getElementById('archive-list-container');

    const wipeChatsBtn = document.getElementById('wipe-chats-btn');
    const wipeAllBtn = document.getElementById('wipe-all-btn');

    const openDocsBtn = document.getElementById('open-docs-btn');
    const openTosBtn = document.getElementById('open-tos-btn');

    // Rename Modal
    const renameModal = document.getElementById('rename-modal');
    const renameInput = document.getElementById('rename-input');
    const renameSaveBtn = document.getElementById('rename-save');
    const renameCancelBtn = document.getElementById('rename-cancel');

    // --- State ---
    let chats = JSON.parse(localStorage.getItem('feathers_chats')) || [];
    let archive = JSON.parse(localStorage.getItem('feathers_archive')) || [];
    let currentChatId = null;
    let confirmAction = null;
    let selectedProvider = localStorage.getItem('feathers_provider') || null;
    let isCompactMode = localStorage.getItem('feathers_compact') === 'true';

    // --- Extensions Engine ---
    let loadedExtensions = JSON.parse(localStorage.getItem('feathers_extensions')) || {};
    let activeAiBlocks = [];
    let activeEventHooks = {};
    let activeInterceptors = {}; // For extension:before-install and future interceptable events

    // ====================================================================
    // FALLBACK MODE - defined FIRST, before window.feathers, so no plugin
    // code can ever override these functions or intercept the keyboard shortcut.
    // Uses Shadow DOM for 100% CSS isolation from the main app.
    // ====================================================================
    let injectedExtScripts = [];
    let isFallbackMode = false;

    function showFallbackMode() {
        if (document.getElementById('fallback-host')) return; // already open
        isFallbackMode = true;
        sessionStorage.setItem('feathers_fallback', 'true');

        // Tear down all active extension state
        injectedExtScripts.forEach(s => s.parentNode && s.parentNode.removeChild(s));
        injectedExtScripts = [];
        activeAiBlocks = [];
        activeEventHooks = {};
        document.querySelectorAll('.nav-item[data-ext-tab]').forEach(el => el.remove());
        document.querySelectorAll('.view[id^="ext-tab-"]').forEach(el => el.remove());

        // Create a shadow host — completely isolated from app CSS scope
        const host = document.createElement('div');
        host.id = 'fallback-host';
        // Use setProperty with 'important' priority so plugin wildcard CSS
        // (e.g. `* { transform: rotate(2deg) !important }`) cannot override us.
        // Inline style !important (via setProperty) beats author-level !important
        // within the same specificity bucket since inline = [1,0,0,0] vs * = [0,0,0,0].
        const hp = (prop, val) => host.style.setProperty(prop, val, 'important');
        hp('position', 'fixed');
        hp('inset', '0');
        hp('z-index', '2147483647');
        hp('pointer-events', 'all');
        hp('transform', 'none');
        hp('rotate', 'none');
        hp('scale', 'none');
        hp('filter', 'none');
        hp('opacity', '1');
        hp('animation', 'none');
        hp('transition', 'none');
        hp('overflow', 'visible');
        hp('cursor', 'auto');
        document.documentElement.appendChild(host); // attach to <html>, not body

        const shadow = host.attachShadow({ mode: 'closed' }); // closed = plugins can't query it

        const exts = Object.values(loadedExtensions);
        const extRows = exts.map(ext => {
            const safeName = (ext.name || ext.id).replace(/&/g, '&amp;').replace(/</g, '&lt;');
            const checked = ext.enabled ? 'checked' : '';
            return `<div class="fb-row">
                <input type="checkbox" id="fb-${ext.id}" ${checked}>
                <label for="fb-${ext.id}">
                    <span class="fb-name">${safeName}</span>
                    <span class="fb-meta">v${ext.version || '1.0'} · ${ext.author || 'Unknown'}</span>
                </label>
            </div>`;
        }).join('');

        shadow.innerHTML = `
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                :host { all: initial; }
                .fb-root {
                    position: fixed; inset: 0;
                    background: #0d0d0d;
                    color: #e0e0e0;
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 14px;
                    overflow-y: auto;
                    z-index: 2147483647;
                    display: flex;
                    align-items: flex-start;
                    justify-content: center;
                }
                .fb-inner {
                    max-width: 560px;
                    width: 100%;
                    padding: 40px 24px;
                }
                .fb-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 6px;
                }
                .fb-title {
                    font-size: 1.5rem;
                    font-weight: 900;
                    color: #ff5252;
                    letter-spacing: -0.5px;
                }
                .fb-warn { font-size: 0.85rem; color: #888; margin-bottom: 6px; line-height: 1.5; }
                .fb-hint { font-size: 0.78rem; color: #555; margin-bottom: 28px; }
                kbd {
                    display: inline-block;
                    background: #1a1a1a;
                    border: 1px solid #444;
                    border-radius: 3px;
                    padding: 1px 6px;
                    font-family: inherit;
                    font-size: 0.78rem;
                }
                .fb-section-label {
                    font-size: 0.7rem;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    color: #555;
                    margin-bottom: 10px;
                    border-top: 1px solid #1e1e1e;
                    padding-top: 20px;
                }
                .fb-row {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 0;
                    border-bottom: 1px solid #1a1a1a;
                }
                .fb-row input[type=checkbox] {
                    width: 16px;
                    height: 16px;
                    cursor: pointer;
                    accent-color: #9b59b6;
                    flex-shrink: 0;
                }
                .fb-row label {
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .fb-name { font-weight: 700; color: #ddd; }
                .fb-meta { font-size: 0.75rem; color: #555; }
                .fb-empty { color: #444; font-style: italic; padding: 8px 0; }
                .fb-actions { display: flex; gap: 10px; margin-top: 28px; flex-wrap: wrap; }
                .fb-btn-primary {
                    background: #9b59b6;
                    color: #fff;
                    border: none;
                    padding: 12px 22px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 0.9rem;
                    font-weight: 700;
                }
                .fb-btn-primary:hover { background: #8e44ad; }
                .fb-btn-secondary {
                    background: transparent;
                    border: 1px solid #333;
                    color: #666;
                    padding: 12px 22px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 0.9rem;
                }
                .fb-btn-secondary:hover { border-color: #555; color: #999; }
                .fb-badge {
                    display: inline-block;
                    background: #1a1a1a;
                    border: 1px solid #2e2e2e;
                    color: #ff5252;
                    font-size: 0.65rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    padding: 2px 6px;
                    border-radius: 3px;
                    vertical-align: middle;
                }
                .fb-mobile-tip { font-size: 0.75rem; color: #444; margin-top: 20px; border-top: 1px solid #1a1a1a; padding-top: 14px; }
            </style>
            <div class="fb-root">
                <div class="fb-inner">
                    <div class="fb-header">
                        <span>⚠️</span>
                        <span class="fb-title">Fallback Mode</span>
                        <span class="fb-badge">ISOLATED</span>
                    </div>
                    <p class="fb-warn">All extensions are <strong>suspended</strong>. This UI is fully isolated — no extension CSS, JS, or code can affect it.</p>
                    <p class="fb-hint">Uncheck an extension to disable it, then click Save. Press <kbd>Ctrl+Shift+D</kbd> again or refresh to exit.<br>Mobile: add <kbd>?fallback</kbd> to the URL in your browser's address bar.</p>

                    <div class="fb-section-label">Installed Extensions — uncheck to disable</div>
                    <div id="fb-list">${extRows || '<p class="fb-empty">No extensions installed.</p>'}</div>

                    <div class="fb-actions">
                        <button class="fb-btn-primary" id="fb-save">Save &amp; Exit Fallback</button>
                        <button class="fb-btn-secondary" id="fb-exit">Exit Without Saving</button>
                    </div>
                    <p class="fb-mobile-tip">On mobile: append <kbd>?fallback</kbd> to your Feathers URL in the address bar and reload to enter this mode. Remove it from the URL and reload to exit.</p>
                </div>
            </div>`;

        shadow.getElementById('fb-save').addEventListener('click', () => {
            exts.forEach(ext => {
                const cb = shadow.getElementById('fb-' + ext.id);
                if (cb) loadedExtensions[ext.id].enabled = cb.checked;
            });
            localStorage.setItem('feathers_extensions', JSON.stringify(loadedExtensions));
            // Full page reload is required — the rogue extension may have injected
            // style tags, setIntervals, or DOM mutations that can't be undone by JS alone.
            sessionStorage.removeItem('feathers_fallback');
            const url = new URL(window.location.href);
            if (url.searchParams.has('fallback')) {
                url.searchParams.delete('fallback');
                window.location.href = url.pathname + (url.search === '?' ? '' : url.search) + url.hash;
            } else {
                window.location.reload();
            }
        });
        shadow.getElementById('fb-exit').addEventListener('click', hideFallbackMode);
    }

    function hideFallbackMode() {
        isFallbackMode = false;
        sessionStorage.removeItem('feathers_fallback');
        const host = document.getElementById('fallback-host');
        if (host) host.remove();
        // Clean URL of ?fallback param
        const url = new URL(window.location.href);
        if (url.searchParams.has('fallback')) {
            url.searchParams.delete('fallback');
            history.replaceState(null, '', url.pathname + (url.search === '?' ? '' : url.search) + url.hash);
        }
        setTimeout(() => initExtensions(), 50);
    }

    // Register keyboard shortcut BEFORE window.feathers so plugins can never intercept it.
    // true = capture phase: fires before any bubble-phase or other capture-phase listener
    // added by plugin code (plugins load async, so they're always registered later).
    document.addEventListener('keydown', function feathersFallbackShortcut(e) {
        if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
            e.preventDefault();
            e.stopImmediatePropagation(); // stop any later capture or bubble listeners
            if (document.getElementById('fallback-host')) {
                hideFallbackMode();
            } else {
                showFallbackMode();
            }
        }
    }, true); // true = capture phase

    // URL-based trigger for mobile users: append ?fallback to address bar
    if (new URL(window.location.href).searchParams.has('fallback')) {
        // Defer slightly so the app finishes its initial render before the overlay appears
        setTimeout(showFallbackMode, 50);
    }

    window.feathers = {
        register: function (config) {
            console.log(`[Feathers] Registering extension: ${config.id}`);

            // Build the scoped API for this extension
            const api = {
                ai: {
                    addBlock: (block) => {
                        activeAiBlocks.push({ extId: config.id, ...block });
                    },
                    generate: async (systemPrompt, userPrompt, history = []) => {
                        const provider = localStorage.getItem('feathers_provider');
                        if (!provider) throw new Error('No AI provider selected in Feathers settings.');
                        const apiKey = localStorage.getItem(`feathers_key_${provider}`);
                        if (!apiKey) throw new Error(`No API key configured for ${provider} in Feathers settings.`);

                        const historyForAi = [...history];
                        if (systemPrompt && systemPrompt.trim() !== '') {
                            historyForAi.unshift({ role: 'system', content: systemPrompt.trim() });
                        }
                        if (userPrompt && userPrompt.trim() !== '') {
                            historyForAi.push({ role: 'user', content: userPrompt.trim() });
                        }

                        // callAIProvider is globally available in app.js
                        return await callAIProvider(provider, apiKey, historyForAi);
                    }
                },
                chat: {
                    getActive: () => {
                        if (!currentChatId) return null;
                        const chat = chats.find(c => c.id === currentChatId);
                        return chat ? { id: chat.id, name: chat.name } : null;
                    },
                    getHistory: (chatId) => {
                        const targetId = chatId || currentChatId;
                        const chat = chats.find(c => c.id === targetId);
                        return chat ? JSON.parse(JSON.stringify(chat.messages)) : null;
                    }
                },
                getResource: (path) => {
                    const resc = config.resources || {};
                    return resc[path] || null;
                },
                events: {
                    on: (event, callback) => {
                        if (!activeEventHooks[event]) activeEventHooks[event] = [];
                        activeEventHooks[event].push({ extId: config.id, callback });
                    },
                    intercept: (event, callback) => {
                        if (!activeInterceptors[event]) activeInterceptors[event] = [];
                        activeInterceptors[event].push({ extId: config.id, callback });
                    }
                },
                ui: {
                    addMessageBadge: (messageId, badgeConfig) => {
                        const chat = chats.find(c => c.id === currentChatId);
                        if (!chat) return;

                        // If messageId is null/undefined, target the very last message in the chat
                        let msg;
                        if (messageId) {
                            msg = chat.messages.find(m => m.id === messageId);
                        } else {
                            msg = chat.messages[chat.messages.length - 1];
                        }

                        if (msg) {
                            if (!msg.badges) msg.badges = [];
                            // Automatically tag with extension ID for visibility control
                            msg.badges.push({ ...badgeConfig, extId: config.id });
                            saveState();
                            renderMessages(chat.messages);
                        }
                    },
                    showToast: (message, type = 'info') => {
                        const toast = document.createElement('div');
                        toast.style.position = 'fixed';
                        toast.style.bottom = '24px';
                        toast.style.right = '24px';
                        toast.style.padding = '12px 20px';
                        toast.style.borderRadius = '8px';
                        toast.style.background = type === 'error' ? '#ff5252' : (type === 'success' ? '#2ecc71' : 'var(--bg-tertiary)');
                        toast.style.color = type === 'error' || type === 'success' ? '#fff' : 'var(--text-primary)';
                        toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                        toast.style.zIndex = '5000';
                        toast.style.border = type === 'info' ? '1px solid var(--border-color)' : 'none';
                        toast.style.fontFamily = 'var(--font-family)';
                        toast.style.fontWeight = '500';
                        toast.style.transition = 'opacity 0.3s, transform 0.3s';
                        toast.style.opacity = '0';
                        toast.style.transform = 'translateY(10px)';

                        let icon = 'fa-info-circle';
                        if (type === 'error') icon = 'fa-exclamation-circle';
                        if (type === 'success') icon = 'fa-check-circle';

                        toast.innerHTML = `<i class="fa-solid ${icon}" style="margin-right:8px;"></i>${message}`;
                        document.body.appendChild(toast);

                        requestAnimationFrame(() => {
                            toast.style.opacity = '1';
                            toast.style.transform = 'translateY(0)';
                        });

                        setTimeout(() => {
                            toast.style.opacity = '0';
                            toast.style.transform = 'translateY(10px)';
                            setTimeout(() => toast.remove(), 300);
                        }, 3000);
                    },
                    createModal: (options) => {
                        const { title, description, contentHtml, onSave, onCancel, saveText = 'Save', cancelText = 'Cancel', icon = 'fa-puzzle-piece' } = options;
                        const overlay = document.createElement('div');
                        overlay.className = 'overlay visible';
                        overlay.style.zIndex = '3000';
                        overlay.innerHTML =
                            '<div class="modal">' +
                            '<h2 class="modal-title"><i class="fa-solid ' + icon + '" style="color:var(--accent-primary);margin-right:8px;"></i>' + title + '</h2>' +
                            (description ? '<p class="modal-desc">' + description + '</p>' : '') +
                            (contentHtml ? '<div style="margin-bottom:24px;">' + contentHtml + '</div>' : '') +
                            '<div class="modal-footer">' +
                            (onCancel ? '<button class="btn-secondary" id="ext-modal-cancel">' + cancelText + '</button>' : '') +
                            (onSave ? '<button class="btn-primary" id="ext-modal-save">' + saveText + '</button>' : '') +
                            '</div>' +
                            '</div>';
                        document.body.appendChild(overlay);

                        if (onCancel) {
                            document.getElementById('ext-modal-cancel').addEventListener('click', () => {
                                onCancel();
                                overlay.remove();
                            });
                        } else {
                            // If no custom onCancel, clicking outside or a generic close could go here, but omitted for simplicity
                        }

                        if (onSave) {
                            document.getElementById('ext-modal-save').addEventListener('click', () => {
                                if (onSave() !== false) {
                                    overlay.remove();
                                }
                            });
                        }
                        return overlay;
                    }
                },
                tabs: {
                    getActive: () => {
                        const activeView = document.querySelector('.view.active');
                        return activeView ? activeView.id : null;
                    },
                    add: (tabConfig) => {
                        const navList = document.querySelector('.nav-links');
                        if (!navList) return;

                        const li = document.createElement('li');
                        li.className = 'nav-item';
                        li.setAttribute('data-view', `ext-tab-${tabConfig.id}`);
                        li.setAttribute('data-ext-tab', 'true'); // mark for cleanup on reinit
                        li.innerHTML = `<i class="${tabConfig.icon || 'fa-solid fa-puzzle-piece'}"></i><span>${tabConfig.title}</span>`;

                        li.addEventListener('click', () => {
                            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
                            li.classList.add('active');
                            const view = document.getElementById(`ext-tab-${tabConfig.id}`);
                            if (view) {
                                view.classList.add('active');
                                api.events.trigger('view:changed', view.id);
                            }
                        });

                        navList.appendChild(li);

                        const mainContent = document.querySelector('.main-content');
                        const section = document.createElement('section');
                        section.id = `ext-tab-${tabConfig.id}`;
                        section.className = 'view';

                        if (tabConfig.render) {
                            tabConfig.render(section);
                        } else if (tabConfig.contentHtml) {
                            section.innerHTML = tabConfig.contentHtml;
                        }

                        mainContent.appendChild(section);
                    }
                },
                store: {
                    get: (key) => {
                        const store = JSON.parse(localStorage.getItem(`ext_store_${config.id}`) || '{}');
                        return store[key];
                    },
                    set: (key, value) => {
                        const store = JSON.parse(localStorage.getItem(`ext_store_${config.id}`) || '{}');
                        store[key] = value;
                        localStorage.setItem(`ext_store_${config.id}`, JSON.stringify(store));
                    }
                }
            };
            // Unconditionally register settings UI if provided by the extension
            if (config.settings) {
                window.feathers_ext_settings = window.feathers_ext_settings || {};
                window.feathers_ext_settings[config.id] = () => config.settings(api);
            }

            // Run the extension's load function if it is enabled
            if (loadedExtensions[config.id] && loadedExtensions[config.id].enabled !== false) {
                try {
                    if (config.onLoad) config.onLoad(api);
                    loadedExtensions[config.id]._onUnload = config.onUnload; // Store for cleanup
                } catch (e) {
                    console.error(`[Feathers] Extension ${config.id} failed to load:`, e);
                }
            } else {
                // If it exists but is disabled, keep a ref to its unload if we just toggled it
                loadedExtensions[config.id]._onUnload = config.onUnload;
            }
        }
    };

    function triggerEvent(event, data) {
        if (!activeEventHooks[event]) return;
        activeEventHooks[event].forEach(hook => {
            try { hook.callback(data); }
            catch (e) { console.error(`[Feathers] Event error in ${hook.extId}:`, e); }
        });
    }

    // Default Extensions Injection
    async function injectDefaultExtensions() {
        let changed = false;

        const defaultExts = [
            { id: 'personification', version: '1.1.2' },
            { id: 'italic', version: '1.1.2' },
            { id: 'develops', version: '1.2.0' },
            { id: 'playground', version: '1.0.0' },
            { id: 'flashcards', version: '2.1.0' },
            { id: 'deepsearch', version: '2.0.0' }
        ];

        const defaultMetadata = {
            'personification': {
                name: 'Personification',
                author: 'Feathers Team',
                description: "Change the AI's personality with presets or custom instructions."
            },
            'italic': {
                name: 'Italic',
                author: 'Feathers Team',
                description: 'Forces the AI to respond in a specific language.'
            },
            'develops': {
                name: 'Develops',
                author: 'Feathers Team',
                description: 'Adds a badge below AI messages showing response latency and estimated token usage.'
            },
            'playground': {
                name: 'Playground',
                author: 'Feathers Team',
                description: 'Adds a comprehensive developer playground sidebar to fine-tune AI generation parameters.'
            },
            'flashcards': {
                name: 'Flashcards',
                author: 'Feathers Team',
                description: 'Generate interactive study flashcards and save them to your library.'
            },
            'deepsearch': {
                name: 'Deep Search',
                author: 'Feathers Team',
                description: 'Highlight text to instantly run a deep AI research query in a side panel.'
            }
        };

        // --- ID MIGRATION & CLEANUP ---
        const migrations = {
            'flashcard-creator': 'flashcards',
            'deep-search': 'deepsearch'
        };

        for (const [oldId, newId] of Object.entries(migrations)) {
            if (loadedExtensions[oldId]) {
                // If the new one doesn't exist yet, migrate the enabled state
                if (loadedExtensions[newId] === undefined) {
                    loadedExtensions[newId] = { enabled: loadedExtensions[oldId].enabled };
                }
                delete loadedExtensions[oldId];
                changed = true;
            }
        }

        for (const ext of defaultExts) {
            try {
                const existing = loadedExtensions[ext.id];
                if (!existing || existing.version !== ext.version) {
                    const res = await fetch(`extensions/${ext.id}.js`);
                    if (res.ok) {
                        const code = await res.text();

                        // Default to ENABLED for new default extensions
                        // Carry over old state if it was already migrated or exists
                        const wasEnabled = existing ? existing.enabled : true;

                        loadedExtensions[ext.id] = {
                            id: ext.id,
                            version: ext.version,
                            name: defaultMetadata[ext.id].name,
                            author: defaultMetadata[ext.id].author,
                            description: defaultMetadata[ext.id].description,
                            enabled: wasEnabled,
                            code: code
                        };
                        changed = true;
                    } else {
                        console.error(`[Feathers] Failed to fetch default extension ${ext.id}: HTTP ${res.status}`);
                    }
                }
            } catch (err) {
                console.error(`[Feathers] Failed to fetch default extension ${ext.id}:`, err);
            }
        }

        if (changed) {
            localStorage.setItem('feathers_extensions', JSON.stringify(loadedExtensions));
        }
    }


    // Load saved extensions from localStorage dynamically
    async function initExtensions() {
        await injectDefaultExtensions();

        // Clean up previously injected extension scripts
        injectedExtScripts.forEach(s => s.parentNode && s.parentNode.removeChild(s));
        injectedExtScripts = [];

        // Clean up extension-added tabs and views from previous init
        document.querySelectorAll('.nav-item[data-ext-tab]').forEach(el => el.remove());
        document.querySelectorAll('.view[id^="ext-tab-"]').forEach(el => el.remove());

        activeAiBlocks = [];
        activeEventHooks = {};
        activeInterceptors = {};
        window.feathers_ext_settings = {};

        if (isFallbackMode) return; // Don't run extensions in fallback mode

        Object.values(loadedExtensions).forEach(ext => {
            if (ext.code) {
                try {
                    const blob = new Blob([ext.code], { type: 'application/javascript' });
                    const url = URL.createObjectURL(blob);
                    const script = document.createElement('script');
                    script.src = url;
                    script.setAttribute('data-ext-id', ext.id);
                    document.head.appendChild(script);
                    injectedExtScripts.push(script);
                } catch (e) {
                    console.error(`[Feathers] Failed to execute extension ${ext.id}:`, e);
                }
            }
        });

        renderExtensions();

        // Re-render active chat messages to reflect badge visibility changes (linked to enabled state)
        if (currentChatId) {
            const chat = chats.find(c => c.id === currentChatId);
            if (chat) renderMessages(chat.messages);
        }
    }

    // --- Core Initialization ---
    updateApiStatusDisplay();
    renderChats();
    applyCompactMode();
    applyScanModeUI();
    setTimeout(initExtensions, 100); // Give DOM a moment to settle

    // Restore view if coming from a settings reload
    if (window.location.hash === '#extensions') {
        setTimeout(() => {
            switchView('extensions-view');
            history.replaceState(null, null, ' '); // Clean URL
        }, 150);
    }

    // --- Functions ---

    function saveState() {
        localStorage.setItem('feathers_chats', JSON.stringify(chats));
        localStorage.setItem('feathers_archive', JSON.stringify(archive));
    }

    function updateApiStatusDisplay() {
        if (selectedProvider) {
            currentProviderSpan.textContent = selectedProvider.toUpperCase();
            const key = localStorage.getItem(`feathers_key_${selectedProvider}`);
            const model = localStorage.getItem(`feathers_model_${selectedProvider}`) || 'Default';
            apiKeyMasked.textContent = key ? `Key: ••••••••${key.slice(-4)}` : 'Key: Not set';
            currentModelSpan.textContent = model;
        } else {
            currentProviderSpan.textContent = 'None';
            currentModelSpan.textContent = 'None';
            apiKeyMasked.textContent = 'Key: Not set';
        }
    }

    function applyCompactMode() {
        updateModeUI(); // Call the new function
    }

    function updateModeUI() {
        const modeNormalBtn = document.getElementById('mode-normal-btn');
        const modeCompactBtn = document.getElementById('mode-compact-btn');
        if (!modeNormalBtn || !modeCompactBtn) return;

        if (isCompactMode) {
            document.body.classList.add('compact-mode');
            modeCompactBtn.classList.add('btn-primary');
            modeCompactBtn.classList.remove('btn-secondary');
            modeNormalBtn.classList.add('btn-secondary');
            modeNormalBtn.classList.remove('btn-primary');
        } else {
            document.body.classList.remove('compact-mode');
            modeNormalBtn.classList.add('btn-primary');
            modeNormalBtn.classList.remove('btn-secondary');
            modeCompactBtn.classList.add('btn-secondary');
            modeCompactBtn.classList.remove('btn-primary');
        }
        triggerEvent('theme:changed', isCompactMode ? 'compact' : 'normal');
    }

    function applyScanModeUI() {
        const mode = localStorage.getItem('feathers_scan_mode') || 'ai';
        const aiBtn = document.getElementById('scan-mode-ai-btn');
        const humanBtn = document.getElementById('scan-mode-human-btn');
        if (!aiBtn || !humanBtn) return;

        if (mode === 'ai') {
            aiBtn.classList.add('btn-primary');
            aiBtn.classList.remove('btn-secondary');
            humanBtn.classList.add('btn-secondary');
            humanBtn.classList.remove('btn-primary');
        } else {
            humanBtn.classList.add('btn-primary');
            humanBtn.classList.remove('btn-secondary');
            aiBtn.classList.add('btn-secondary');
            aiBtn.classList.remove('btn-primary');
        }
    }

    function renderChats() {
        chatList.innerHTML = '';
        if (chats.length === 0) {
            chatList.innerHTML = '<p style="text-align: center; color: var(--text-muted); font-size: 0.8rem; margin-top: 20px;">No chats yet</p>';
            return;
        }

        chats.forEach(chat => {
            const item = document.createElement('div');
            item.className = `chat-list-item ${currentChatId === chat.id ? 'active' : ''}`;
            const lastMsg = chat.messages?.[chat.messages.length - 1]?.content || 'New conversation';
            item.innerHTML = `
                <div class="chat-item-icon">${chat.name.charAt(0)}</div>
                <div class="chat-item-info">
                    <div class="chat-item-name">${chat.name}</div>
                    <div class="chat-item-preview">${lastMsg}</div>
                </div>
            `;
            item.addEventListener('click', () => selectChat(chat.id));
            chatList.appendChild(item);
        });
    }

    function selectChat(id) {
        currentChatId = id;
        const chat = chats.find(c => c.id === id);
        if (chat) {
            activeChatTitle.textContent = chat.name;
            noChatSelected.style.display = 'none';
            activeChatContainer.style.display = 'flex';
            renderMessages(chat.messages || []);
            renderChats();
        }
    }

    function renderMessages(messages) {
        chatMessages.innerHTML = '';
        messages.forEach(msg => {
            const bubble = document.createElement('div');
            bubble.className = `message ${msg.role}`;

            let html = formatMessage(msg.content, msg.role);

            // Render persistent badges (only if the originating extension is enabled)
            if (msg.badges && msg.badges.length > 0) {
                msg.badges.forEach(b => {
                    const ext = loadedExtensions[b.extId];
                    if (!b.extId || (ext && ext.enabled)) {
                        html += `<div class="ext-badge ext-badge-${b.style || 'subtle'}"><i class="${b.icon}"></i> ${b.text}</div>`;
                    }
                });
            }

            bubble.innerHTML = html;
            chatMessages.appendChild(bubble);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function formatMessage(text, role) {
        if (!text) return '';

        // Initial sanitization
        let formatted = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Headers - ONLY FOR AI
        if (role === 'ai') {
            formatted = formatted.replace(/^### (.*$)/gm, '<h3>$1</h3>');
            formatted = formatted.replace(/^## (.*$)/gm, '<h2>$1</h2>');
            formatted = formatted.replace(/^# (.*$)/gm, '<h1>$1</h1>');
        }

        // Code blocks - also handle language tag if present
        formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, '<div class="code-container"><button class="copy-code-btn" title="Copy code"><i class="fa-solid fa-copy"></i></button><pre><code>$2</code></pre></div>');
        formatted = formatted.replace(/```([\s\S]*?)```/g, '<div class="code-container"><button class="copy-code-btn" title="Copy code"><i class="fa-solid fa-copy"></i></button><pre><code>$1</code></pre></div>');

        // Inline code
        formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Bold
        formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        // Italic
        formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');

        // Lists
        formatted = formatted.replace(/^\s*[\-\*]\s+(.*)$/gm, '<li>$1</li>');
        formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

        // Newlines (skip if it ends with a tag already)
        formatted = formatted.replace(/\n(?![^<]*>)/g, '<br>');

        return formatted;
    }

    function createNewChat() {
        const id = Date.now().toString();
        const newChat = {
            id,
            name: 'New Chat ' + (chats.length + 1),
            messages: []
        };
        chats.unshift(newChat);
        saveState();
        selectChat(id);
    }

    function showConfirmation(title, desc, onProceed) {
        confirmTitle.textContent = title;
        confirmDesc.textContent = desc;
        confirmAction = onProceed;
        confirmModal.classList.add('visible');
    }

    async function handleSendMessage(e) {
        e.preventDefault();
        const text = chatInputField.value.trim();
        if (!text || !currentChatId) return;

        const provider = localStorage.getItem('feathers_provider');
        const apiKey = localStorage.getItem(`feathers_key_${provider}`);

        if (!provider || !apiKey) {
            alert('Please configure your API key in Settings first!');
            switchView('settings-view');
            return;
        }

        const chat = chats.find(c => c.id === currentChatId);
        if (!chat) return;

        // Add user message
        const userMsg = { id: Date.now().toString(), role: 'user', content: text, badges: [] };
        chat.messages.push(userMsg);
        chatInputField.value = '';
        renderMessages(chat.messages);
        renderChats();
        saveState();

        // Trigger event
        triggerEvent('message:sent', { id: userMsg.id, content: text, chatId: currentChatId });

        // Show thinking state
        const aiMsgId = (Date.now() + 1).toString();
        const aiMsgObj = { id: aiMsgId, role: 'ai', content: '...', badges: [] };
        chat.messages.push(aiMsgObj);
        renderMessages(chat.messages);

        // Compile AI Blocks (System Prompts) from extensions
        let systemPrompt = '';
        activeAiBlocks.filter(b => b.type === 'system').forEach(b => {
            systemPrompt += b.content + '\n\n';
        });

        const historyForAi = chat.messages.slice(0, -1);
        if (systemPrompt.trim() !== '') {
            // Prepend system prompt to history for the AI provider
            historyForAi.unshift({ role: 'system', content: systemPrompt.trim() });
        }

        try {
            const response = await callAIProvider(provider, apiKey, historyForAi);
            aiMsgObj.content = response;
            triggerEvent('message:received', { id: aiMsgId, content: response, chatId: currentChatId });
        } catch (err) {
            aiMsgObj.content = 'Error: ' + err.message;
        }

        renderMessages(chat.messages);
        saveState();
        renderChats();
    }

    async function callAIProvider(provider, apiKey, history) {
        let url = '';
        let body = {};
        let headers = { 'Content-Type': 'application/json' };
        const model = localStorage.getItem(`feathers_model_${provider}`);

        if (provider === 'gemini') {
            const geminiModel = model || 'gemini-1.5-flash';
            url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;
            body = {
                contents: history.map(m => ({
                    role: m.role === 'user' ? 'user' : 'model',
                    parts: [{ text: m.content }]
                }))
            };
            const res = await fetch(url, { method: 'POST', body: JSON.stringify(body) });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            return data.candidates[0].content.parts[0].text;
        }

        if (provider === 'chatgpt') {
            url = 'https://api.openai.com/v1/chat/completions';
            headers['Authorization'] = `Bearer ${apiKey}`;
            body = {
                model: model || 'gpt-3.5-turbo',
                messages: history.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }))
            };
            const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            return data.choices[0].message.content;
        }

        if (provider === 'openrouter') {
            url = 'https://openrouter.ai/api/v1/chat/completions';
            headers['Authorization'] = `Bearer ${apiKey}`;
            headers['HTTP-Referer'] = window.location.origin;
            headers['X-Title'] = 'Feathers AI';
            body = {
                model: model || 'openai/gpt-3.5-turbo',
                messages: history.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }))
            };
            const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            return data.choices[0].message.content;
        }

        throw new Error('Provider ' + provider + ' integration coming soon!');
    }

    function switchView(viewId) {
        document.querySelectorAll('.nav-item').forEach(i => {
            i.classList.toggle('active', i.getAttribute('data-view') === viewId);
        });
        document.querySelectorAll('.view').forEach(v => {
            v.classList.toggle('active', v.id === viewId);
        });

        // Trigger event for extensions
        Object.values(activeEventHooks['view:changed'] || []).forEach(cb => {
            try { cb(viewId); } catch (e) { console.error('[Feathers] Event Error (view:changed):', e); }
        });
    }

    function renderArchive() {
        archiveListContainer.innerHTML = '';
        const now = Date.now();
        const fortyEightHours = 48 * 60 * 60 * 1000;

        archive = archive.filter(item => now - item.deletedAt < fortyEightHours);
        saveState();

        if (archive.length === 0) {
            archiveListContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); margin-top: 40px;">No archived chats found.</p>';
            return;
        }

        archive.forEach(item => {
            const div = document.createElement('div');
            div.className = 'archive-item';
            const timeLeft = Math.max(0, Math.round((fortyEightHours - (now - item.deletedAt)) / (60 * 60 * 1000)));
            div.innerHTML = `
                <div class="archive-item-info">
                    <h4>${item.name}</h4>
                    <p>Deleted ${new Date(item.deletedAt).toLocaleString()} • Expires in ${timeLeft}h</p>
                </div>
                <button class="btn-primary" style="width: auto; padding: 6px 12px;" onclick="window.restoreFromUI('${item.id}')">Restore</button>
            `;
            archiveListContainer.appendChild(div);
        });
    }

    window.restoreFromUI = (id) => {
        const index = archive.findIndex(c => c.id === id);
        if (index !== -1) {
            const chat = archive.splice(index, 1)[0];
            delete chat.deletedAt;
            chats.unshift(chat);
            saveState();
            renderChats();
            renderArchive();
        }
    };

    // --- Event Listeners ---

    // Global delegation for dynamic elements
    document.body.addEventListener('click', (e) => {
        // Copy Code Button
        const copyBtn = e.target.closest('.copy-code-btn');
        if (copyBtn) {
            const container = copyBtn.closest('.code-container');
            if (container) {
                const codeEl = container.querySelector('code');
                if (codeEl) {
                    navigator.clipboard.writeText(codeEl.innerText).then(() => {
                        const icon = copyBtn.querySelector('i');
                        if (icon) {
                            icon.className = 'fa-solid fa-check';
                            setTimeout(() => { icon.className = 'fa-solid fa-copy'; }, 2000);
                        }
                    });
                }
            }
        }
    });

    navItems.forEach(item => {
        item.addEventListener('click', () => switchView(item.getAttribute('data-view')));
    });

    // Sidebar Toggles
    mainSidebarToggle?.addEventListener('click', () => mainSidebar.classList.toggle('collapsed'));

    function toggleChatSidebar() {
        chatSidebar.classList.toggle('collapsed');
    }

    chatSidebarToggle?.addEventListener('click', toggleChatSidebar);
    toggleChatSidebarBtn?.addEventListener('click', toggleChatSidebar);

    // Chat Actions
    newChatBtn.addEventListener('click', createNewChat);
    emptyNewChatBtn.addEventListener('click', createNewChat);
    chatInputForm.addEventListener('submit', handleSendMessage);

    // Extensions Manager
    function renderExtensions() {
        const list = document.getElementById('extensions-list');
        if (!list) return;

        list.innerHTML = '';
        const exts = Object.values(loadedExtensions);

        if (exts.length === 0) {
            list.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">No extensions loaded. Upload a .js file to get started.</div>`;
            return;
        }

        const DEFAULT_EXT_IDS = ['personification', 'italic', 'develops', 'playground', 'flashcards', 'deepsearch'];

        exts.forEach(ext => {
            const hasSettings = ext.code && /settings\s*\(/.test(ext.code);
            const isCustom = !DEFAULT_EXT_IDS.includes(ext.id); // user-uploaded extension

            const card = document.createElement('div');
            card.className = 'extension-card';
            card.innerHTML = `
                <div class="ext-icon" style="color: var(--accent-primary);"><i class="fa-solid fa-puzzle-piece"></i></div>
                <div class="ext-name">${(ext.name || ext.id).replace(/\s*\([^)]*\)/g, '').trim()} <span style="font-size: 0.7rem; color: var(--text-muted); font-weight: normal;">v${ext.version || '1.0'}</span></div>
                <div class="ext-author">by ${ext.author || 'Unknown'}</div>
                <div class="ext-desc">${ext.description || ''}</div>
                <div class="ext-footer">
                    <div style="display:flex;gap:6px;align-items:center;">
                        ${hasSettings ? '<button class="icon-btn ext-settings-btn" title="Extension Settings"><i class="fa-solid fa-gear"></i></button>' : ''}
                        ${isCustom ? '<div class="ext-dots-wrapper" style="position:relative;"><button class="icon-btn ext-dots-btn" title="More options"><i class="fa-solid fa-ellipsis-vertical"></i></button><div class="ext-dots-menu" style="display:none;position:absolute;right:0;bottom:calc(100% + 4px);background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:8px;min-width:130px;box-shadow:0 4px 16px rgba(0,0,0,0.4);z-index:200;overflow:hidden;"><button class="ext-delete-btn" style="display:block;width:100%;padding:10px 14px;background:none;border:none;color:#ff5252;cursor:pointer;text-align:left;font-size:0.9rem;font-family:inherit;"><i class="fa-solid fa-trash" style="margin-right:8px;"></i>Delete</button></div></div>' : ''}
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" class="ext-toggle" ${ext.enabled ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
            `;

            // Toggle logic
            const toggle = card.querySelector('.ext-toggle');
            toggle.addEventListener('change', (e) => {
                const wasEnabled = loadedExtensions[ext.id].enabled;
                loadedExtensions[ext.id].enabled = e.target.checked;

                // If disabling, trigger onUnload
                if (wasEnabled && !e.target.checked && ext._onUnload) {
                    try {
                        // Pass a dummy API or reconstruct it if needed, mainly for cleanup
                        ext._onUnload({});
                    } catch (err) {
                        console.error(`[Feathers] Extension ${ext.id} failed to unload:`, err);
                    }
                }

                localStorage.setItem('feathers_extensions', JSON.stringify(loadedExtensions));
                setTimeout(() => initExtensions(), 50);
            });

            // Settings button
            const settingsBtn = card.querySelector('.ext-settings-btn');
            if (settingsBtn) {
                settingsBtn.addEventListener('click', () => {
                    if (window.feathers_ext_settings && window.feathers_ext_settings[ext.id]) {
                        window.feathers_ext_settings[ext.id]();
                    } else {
                        alert('Settings are not ready yet. Wait a moment and try again.');
                    }
                });
            }

            // 3-dots menu for custom extensions
            if (isCustom) {
                const dotsBtn = card.querySelector('.ext-dots-btn');
                const dotsMenu = card.querySelector('.ext-dots-menu');
                const deleteBtn = card.querySelector('.ext-delete-btn');

                dotsBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    dotsMenu.style.display = dotsMenu.style.display === 'none' ? 'block' : 'none';
                });

                // Close dropdown when clicking elsewhere
                document.addEventListener('click', function closeDots() {
                    dotsMenu.style.display = 'none';
                    document.removeEventListener('click', closeDots);
                });

                deleteBtn.addEventListener('click', () => {
                    dotsMenu.style.display = 'none';
                    // Site-styled confirmation dialog
                    const confirmOverlay = document.createElement('div');
                    confirmOverlay.className = 'overlay visible';
                    confirmOverlay.style.zIndex = '3000';
                    const safeName = (ext.name || ext.id).replace(/</g, '&lt;');
                    confirmOverlay.innerHTML = `
                        <div class="modal">
                            <h2 class="modal-title" style="color:#ff5252;"><i class="fa-solid fa-trash"></i> Delete Extension</h2>
                            <p class="modal-desc">Are you sure you want to delete <strong>${safeName}</strong>? This cannot be undone — you'll need to re-upload the file to restore it.</p>
                            <div class="modal-footer">
                                <button class="btn-secondary" id="del-cancel">Cancel</button>
                                <button class="btn-primary" id="del-confirm" style="background:#ff5252;">Delete</button>
                            </div>
                        </div>`;
                    document.body.appendChild(confirmOverlay);
                    document.getElementById('del-cancel').addEventListener('click', () => confirmOverlay.remove());
                    document.getElementById('del-confirm').addEventListener('click', () => {
                        if (ext.enabled && ext._onUnload) {
                            try { ext._onUnload({}); } catch (e) { }
                        }
                        delete loadedExtensions[ext.id];
                        localStorage.setItem('feathers_extensions', JSON.stringify(loadedExtensions));
                        confirmOverlay.remove();
                        initExtensions();
                    });
                });
            }

            list.appendChild(card);
        });
    }


    const uploadBtn = document.getElementById('ext-upload-btn');
    const uploadInput = document.getElementById('ext-upload-input');

    if (uploadBtn && uploadInput) {
        uploadBtn.addEventListener('click', () => uploadInput.click());
        uploadInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                let extData = null;

                if (file.name.endsWith('.zip')) {
                    // Extract Packaged Extension (V2)
                    const zip = await JSZip.loadAsync(file);

                    // Root manifest required
                    const manifestFile = zip.file('manifest.json');
                    if (!manifestFile) {
                        throw new Error('manifest.json is missing from the ZIP root.');
                    }

                    const manifestRaw = await manifestFile.async('string');
                    let manifest;
                    try {
                        manifest = JSON.parse(manifestRaw);
                    } catch (err) {
                        throw new Error('manifest.json is not valid JSON.');
                    }

                    if (!manifest.id || !manifest.name || !manifest.main) {
                        throw new Error('manifest.json must contain "id", "name", and "main".');
                    }

                    // Main entry script
                    const mainFile = zip.file(manifest.main);
                    if (!mainFile) {
                        throw new Error(`Main script "${manifest.main}" not found in ZIP.`);
                    }
                    const mainCode = await mainFile.async('string');

                    // Read resources (images, css, html templates)
                    const resources = {};
                    for (const [path, zipEntry] of Object.entries(zip.files)) {
                        if (!zipEntry.dir && path !== 'manifest.json' && path !== manifest.main) {
                            // Determine mime type roughly
                            let mime = 'application/octet-stream';
                            if (path.endsWith('.css')) mime = 'text/css';
                            else if (path.endsWith('.html')) mime = 'text/html';
                            else if (path.endsWith('.png')) mime = 'image/png';
                            else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) mime = 'image/jpeg';
                            else if (path.endsWith('.svg')) mime = 'image/svg+xml';

                            const base64 = await zipEntry.async('base64');
                            resources[path] = `data:${mime};base64,${base64}`;
                        }
                    }

                    extData = {
                        id: manifest.id,
                        name: manifest.name,
                        version: manifest.version || '1.0',
                        author: manifest.author || 'Unknown',
                        description: manifest.description || '',
                        code: mainCode,
                        resources: resources,
                        enabled: true
                    };
                } else if (file.name.endsWith('.js')) {
                    // Legacy Single-File Extension (V1 fallback)
                    const code = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = e => resolve(e.target.result);
                        reader.onerror = reject;
                        reader.readAsText(file);
                    });

                    const idMatch = code.match(/id:\s*['"]([^'"]+)['"]/);
                    const nameMatch = code.match(/name:\s*['"]([^'"]+)['"]/);

                    if (!idMatch || !idMatch[1]) {
                        throw new Error('Invalid .js extension. Could not find "id" in feathers.register()');
                    }

                    const extId = idMatch[1];
                    extData = {
                        id: extId,
                        name: nameMatch ? nameMatch[1] : extId,
                        version: code.match(/version:\s*['"]([^'"]+)['"]/)?.[1] || '1.0',
                        author: code.match(/author:\s*['"]([^'"]+)['"]/)?.[1] || 'Unknown',
                        description: code.match(/description:\s*['"]([^'"]+)['"]/)?.[1] || '',
                        code: code,
                        resources: {},
                        enabled: true
                    };
                } else {
                    throw new Error('Invalid file type. Please upload a .zip or .js file.');
                }

                // --- HARDCODED SECURITY SCANNER ---
                const scanMode = localStorage.getItem('feathers_scan_mode') || 'ai';
                const provider = localStorage.getItem('feathers_provider');
                const apiKey = localStorage.getItem(`feathers_key_${provider}`);

                function installExtension() {
                    loadedExtensions[extData.id] = extData;
                    localStorage.setItem('feathers_extensions', JSON.stringify(loadedExtensions));
                    uploadInput.value = '';
                    setTimeout(() => initExtensions(), 50);
                }

                function scriptScan(code) {
                    const threats = [];
                    const lines = code.split('\n');
                    lines.forEach((line, i) => {
                        if (line.includes('eval(')) threats.push({ level: 'HIGH', label: 'eval() detected', snippet: `Line ${i + 1}: ${line.trim()}` });
                        if (line.match(/document\.cookie/i)) threats.push({ level: 'MEDIUM', label: 'Cookie access', snippet: `Line ${i + 1}: ${line.trim()}` });
                        if (line.match(/localStorage/i)) threats.push({ level: 'MEDIUM', label: 'localStorage access', snippet: `Line ${i + 1}: ${line.trim()}` });
                    });
                    return threats;
                }

                function showReviewModal(findings, summary) {
                    const isSuspicious = findings && findings.length > 0;

                    const overlay = document.createElement('div');
                    overlay.className = 'overlay visible';
                    overlay.style.zIndex = '4000';

                    let html = `
                        <div class="modal" style="max-width: 500px;">
                            <h2 class="modal-title" style="color:${isSuspicious ? '#ff5252' : 'var(--text-primary)'};">
                                <i class="fa-solid ${isSuspicious ? 'fa-shield-halved' : 'fa-puzzle-piece'}"></i> 
                                ${isSuspicious ? 'Security Alert: ' + extData.name : 'Review Extension: ' + extData.name}
                            </h2>
                            <p>${summary || 'Local scan completed. No AI summary available.'}</p>`;

                    if (isSuspicious) {
                        html += `<div style="margin-top: 16px; background: rgba(255, 82, 82, 0.1); border-left: 4px solid #ff5252; padding: 12px; border-radius: 4px; max-height: 200px; overflow-y: auto;">`;
                        html += `<h4 style="margin:0 0 8px 0; color:#ff5252"><i class="fa-solid fa-triangle-exclamation"></i> Risks Detected</h4>`;
                        html += `<ul style="margin:0; padding-left: 20px; font-size: 0.9rem; color: var(--text-secondary);">`;
                        findings.forEach(f => {
                            html += `<li style="margin-bottom:8px;"><strong>${f.level || 'HIGH'} - ${f.label}</strong><br><code style="font-size:0.8rem;background:rgba(255,82,82,0.2);padding:2px 4px;border-radius:4px;display:inline-block;margin-top:4px;word-break:break-all;">${(f.snippet || 'Code hidden').replace(/</g, '&lt;')}</code></li>`;
                        });
                        html += `</ul></div>`;
                    } else if (scanMode === 'script') {
                        // If human mode and clean, skip modal
                        installExtension();
                        return;
                    }

                    html += `<div class="modal-footer" style="margin-top: 24px;">`;
                    html += `<button class="btn-secondary" id="mi-decline" style="flex:1;">Cancel</button>`;
                    html += `<button class="btn-primary" id="mi-confirm" style="flex:1;${isSuspicious ? 'background:#ff5252;' : ''}">Download Anyways</button>`;
                    html += `</div></div>`;

                    overlay.innerHTML = html;
                    document.body.appendChild(overlay);

                    document.getElementById('mi-decline').onclick = () => { overlay.remove(); uploadInput.value = ''; };
                    document.getElementById('mi-confirm').onclick = () => { overlay.remove(); installExtension(); };
                }

                if (scanMode === 'script' || !provider || !apiKey) {
                    showReviewModal(scriptScan(extData.code), null);
                } else {
                    const scanOverlay = document.createElement('div');
                    scanOverlay.className = 'overlay visible';
                    scanOverlay.style.zIndex = '4000';
                    scanOverlay.innerHTML = `
                        <div class="modal">
                            <h2 class="modal-title"><i class="fa-solid fa-shield-halved"></i> Scanning Extension...</h2>
                            <p>Analyzing <strong>${extData.name}</strong> for security risks. Please wait...</p>
                            <div style="display:flex; justify-content:center; padding: 20px;">
                                <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 2rem; color: var(--accent-primary);"></i>
                            </div>
                        </div>`;
                    document.body.appendChild(scanOverlay);

                    try {
                        const prompt = `Review this Feathers extension JS code. Detect security risks (HIGH/MEDIUM) and provide a 2-3 sentence summary of what the plugin does. Respond ONLY with JSON: { "summary": "string", "findings": [{ "level": "string", "label": "string", "snippet": "string" }] }.

Code:
${extData.code.substring(0, 5000)}`;

                        const responseRaw = await callAIProvider(provider, apiKey, [{ role: 'user', content: prompt }]);

                        const jsonMatch = responseRaw.match(/\{[\s\S]*\}/);
                        if (!jsonMatch) throw new Error('No JSON object found in response.');

                        const r = JSON.parse(jsonMatch[0]);
                        scanOverlay.remove();
                        showReviewModal(r.findings || [], r.summary);

                    } catch (e) {
                        console.error("[Feathers] AI Scan failed:", e);
                        scanOverlay.remove();
                        // Fallback to script mode if AI fails completely
                        const fb = scriptScan(extData.code);
                        showReviewModal(fb, "AI analysis failed. Local scan completed.");
                    }
                }
            } catch (err) {
                alert(`Extension Upload Failed:\n${err.message}`);
                uploadInput.value = '';
            }
        });
    }
    // --- Event Listeners ---

    // ---- Fallback Mode Keyboard Shortcut: Ctrl+Shift+D ----
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (document.getElementById('fallback-overlay')) {
                hideFallbackMode();
            } else {
                showFallbackMode();
            }
        }
    }, true); // capture phase to beat browser/extension shortcuts

    chatOptionsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        chatDropdown.classList.toggle('visible');
    });

    document.addEventListener('click', () => chatDropdown.classList.remove('visible'));

    renameChatOpt.addEventListener('click', (e) => {
        e.stopPropagation();
        chatDropdown.classList.remove('visible');

        const chat = chats.find(c => c.id === currentChatId);
        if (!chat) return;

        renameInput.value = chat.name;
        renameModal.classList.add('visible');
        setTimeout(() => renameInput.focus(), 100);
    });

    renameSaveBtn.addEventListener('click', () => {
        const chat = chats.find(c => c.id === currentChatId);
        const newName = renameInput.value.trim();
        if (chat && newName) {
            chat.name = newName;
            activeChatTitle.textContent = chat.name;
            saveState();
            renderChats();
        }
        renameModal.classList.remove('visible');
    });

    renameCancelBtn.addEventListener('click', () => {
        renameModal.classList.remove('visible');
    });

    // Close rename modal on Enter key
    renameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') renameSaveBtn.click();
        if (e.key === 'Escape') renameCancelBtn.click();
    });

    deleteChatOpt.addEventListener('click', () => {
        showConfirmation('Delete Chat', 'Move this chat to archive for 48 hours?', () => {
            const index = chats.findIndex(c => c.id === currentChatId);
            if (index !== -1) {
                const chat = chats.splice(index, 1)[0];
                chat.deletedAt = Date.now();
                archive.unshift(chat);
                saveState();
                currentChatId = null;
                activeChatContainer.style.display = 'none';
                noChatSelected.style.display = 'flex';
                renderChats();
            }
        });
    });

    // API Manager
    manageApiBtn.addEventListener('click', () => {
        apiManagerOverlay.classList.add('visible');
        if (selectedProvider) {
            providerOptions.forEach(opt => opt.classList.toggle('active', opt.dataset.provider === selectedProvider));
            apiKeyInput.value = localStorage.getItem(`feathers_key_${selectedProvider}`) || '';
            modelIdInput.value = localStorage.getItem(`feathers_model_${selectedProvider}`) || '';
        }
    });

    providerOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            providerOptions.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            selectedProvider = opt.dataset.provider;
            apiKeyInput.value = localStorage.getItem(`feathers_key_${selectedProvider}`) || '';
            modelIdInput.value = localStorage.getItem(`feathers_model_${selectedProvider}`) || '';
        });
    });

    saveApiConfigBtn.addEventListener('click', () => {
        if (!selectedProvider) return alert('Select a provider!');
        const key = apiKeyInput.value.trim();
        const model = modelIdInput.value.trim();
        if (!key) return alert('Enter an API key!');

        localStorage.setItem('feathers_provider', selectedProvider);
        localStorage.setItem(`feathers_key_${selectedProvider}`, key);
        if (model) {
            localStorage.setItem(`feathers_model_${selectedProvider}`, model);
        } else {
            localStorage.removeItem(`feathers_model_${selectedProvider}`);
        }
        updateApiStatusDisplay();
        apiManagerOverlay.classList.remove('visible');
    });

    // Modals
    confirmCancel.addEventListener('click', () => confirmModal.classList.remove('visible'));
    confirmProceed.addEventListener('click', () => {
        if (confirmAction) confirmAction();
        confirmModal.classList.remove('visible');
    });

    openArchiveBtn.addEventListener('click', () => {
        renderArchive();
        archiveOverlay.classList.add('visible');
    });

    document.querySelectorAll('.close-overlay').forEach(b => {
        b.addEventListener('click', () => document.getElementById(b.dataset.close).classList.remove('visible'));
    });

    // Danger Zone
    wipeChatsBtn.addEventListener('click', () => {
        showConfirmation('Wipe All Chats', 'Delete all chats and archive forever?', () => {
            chats = [];
            archive = [];
            saveState();
            currentChatId = null;
            activeChatContainer.style.display = 'none';
            noChatSelected.style.display = 'flex';
            renderChats();
        });
    });

    wipeAllBtn.addEventListener('click', () => {
        showConfirmation('Wipe All Data', 'Reset EVERYTHING?', () => {
            localStorage.clear();
            window.location.reload();
        });
    });

    openDocsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.open('docs.html', '_blank');
    });
    openTosBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.open('TermsOfService.html', '_blank');
    });

    document.getElementById('mode-normal-btn')?.addEventListener('click', () => {
        isCompactMode = false;
        localStorage.setItem('feathers_compact', 'false');
        applyCompactMode();
    });

    document.getElementById('mode-compact-btn')?.addEventListener('click', () => {
        isCompactMode = true;
        localStorage.setItem('feathers_compact', 'true');
        applyCompactMode();
    });

    document.getElementById('scan-mode-ai-btn')?.addEventListener('click', () => {
        localStorage.setItem('feathers_scan_mode', 'ai');
        applyScanModeUI();
    });

    document.getElementById('scan-mode-human-btn')?.addEventListener('click', () => {
        localStorage.setItem('feathers_scan_mode', 'human');
        applyScanModeUI();
    });
});
