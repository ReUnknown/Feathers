feathers.register({
    id: 'flashcards',
    name: 'Flashcards',
    version: '2.1.0',
    author: 'Feathers Team',
    description: 'Generate interactive study flashcards and save them to your library.',

    onLoad(api) {
        // -------------------------------------------------------
        // STATE MANAGEMENT & STORAGE
        // -------------------------------------------------------
        let savedDecks = [];
        let activeDeck = null;
        let currentIndex = 0;
        let currentMode = 'word-to-def'; // 'word-to-def', 'def-to-word', 'mix'

        // Load existing decks from storage
        const stored = api.store.get('fc-saved-decks');
        if (stored) {
            try {
                savedDecks = JSON.parse(stored);
            } catch (e) {
                console.error("Failed to parse saved decks", e);
                savedDecks = [];
            }
        }

        const saveToStorage = () => {
            api.store.set('fc-saved-decks', JSON.stringify(savedDecks));
        };

        // -------------------------------------------------------
        // ADD SIDEBAR TAB
        // -------------------------------------------------------
        api.tabs.add({
            id: 'study-flashcards',
            title: 'Flashcards',
            icon: 'fa-solid fa-layer-group',
            render: (container) => {
                container.style.height = '100%';
                container.style.overflowY = 'auto';
                container.style.background = 'var(--bg-primary)';

                // Inject CSS
                const style = document.createElement('style');
                style.textContent = `
                    .fc-scene {
                        perspective: 1000px; width: 100%; height: 350px; margin: 24px 0; cursor: pointer;
                    }
                    .fc-card {
                        width: 100%; height: 100%; position: relative; transition: transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1); transform-style: preserve-3d;
                    }
                    .fc-card.is-flipped { transform: rotateY(180deg); }
                    .fc-face {
                        position: absolute; width: 100%; height: 100%; backface-visibility: hidden; display: flex; align-items: center; justify-content: center;
                        padding: 40px; text-align: center; border-radius: 16px; border: 1px solid var(--border-color); box-shadow: 0 8px 24px rgba(0,0,0,0.15);
                        font-size: 1.3rem; line-height: 1.6; color: var(--text); overflow-y: auto;
                    }
                    .fc-face-front { background: var(--bg-tertiary); }
                    .fc-face-back { background: var(--bg-secondary); transform: rotateY(180deg); color: var(--accent-primary); }
                    
                    .fc-nav-btn {
                        background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text); padding: 10px 24px; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.2s;
                    }
                    .fc-nav-btn:hover:not(:disabled) { background: var(--accent-primary); color: white; border-color: var(--accent-primary); }
                    .fc-nav-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                    
                    .fc-file-upload-wrapper {
                        position: relative; background: var(--bg-tertiary); border: 2px dashed var(--border-color); padding: 16px; border-radius: 8px; margin-bottom: 20px; text-align: center; transition: border-color 0.2s;
                    }
                    .fc-file-upload-wrapper:hover { border-color: var(--accent-primary); }
                    .fc-file-upload-wrapper input[type="file"] { color: var(--text-secondary); font-size: 0.9rem; width: 100%; cursor: pointer; }
                    .fc-file-upload-wrapper input[type="file"]::file-selector-button {
                        background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text); padding: 6px 16px; border-radius: 6px; cursor: pointer; margin-right: 12px; transition: background 0.2s;
                    }
                    .fc-file-upload-wrapper input[type="file"]::file-selector-button:hover { background: var(--bg-primary); }
                    
                    /* Library List Styles */
                    .fc-deck-item {
                        display: flex; justify-content: space-between; align-items: center; background: var(--bg-secondary); border: 1px solid var(--border-color);
                        padding: 16px; border-radius: 12px; margin-bottom: 12px; transition: border-color 0.2s;
                    }
                    .fc-deck-item:hover { border-color: var(--accent-primary); }
                    .fc-deck-info h4 { margin: 0 0 4px 0; color: var(--text); font-size: 1.1rem; }
                    .fc-deck-info p { margin: 0; color: var(--text-secondary); font-size: 0.85rem; }
                    .fc-deck-actions { display: flex; gap: 8px; }
                    .fc-icon-btn {
                        background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text); width: 36px; height: 36px; border-radius: 6px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center;
                    }
                    .fc-icon-btn:hover { background: var(--bg-primary); color: var(--accent-primary); }
                    .fc-icon-btn.delete:hover { color: #ff6b6b; border-color: #ff6b6b; }
                `;
                container.appendChild(style);

                // Build the Tab UI
                const wrapper = document.createElement('div');
                wrapper.innerHTML = `
                    <div class="view-header" style="padding: 24px 32px; border-bottom: 1px solid var(--border-color); position: sticky; top: 0; background: var(--bg-primary); z-index: 10; display: flex; justify-content: space-between; align-items: center;">
                        <h2 style="margin: 0; display: flex; align-items: center; gap: 12px; font-size: 1.5rem; color: var(--text);">
                            <i class="fa-solid fa-layer-group" style="color: var(--accent-primary);"></i> Flashcards
                        </h2>
                        <button id="fc-toggle-library-btn" class="fc-nav-btn" style="padding: 8px 16px; font-size: 0.95rem;">
                            <i class="fa-solid fa-book-bookmark"></i> My Decks
                        </button>
                    </div>
                    
                    <div style="padding: 32px; max-width: 800px; margin: 0 auto; position: relative;">
                        
                        <div id="fc-input-section" style="background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 32px; border-radius: 16px; margin-bottom: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                            <h3 style="margin-top: 0; color: var(--text); font-size: 1.2rem; margin-bottom: 8px;">1. Provide Source Material</h3>
                            <p style="color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 20px;">Paste text from a PDF/Doc or upload a .txt file. The AI will automatically name your deck!</p>
                            
                            <div class="fc-file-upload-wrapper">
                                <input type="file" id="fc-file-upload" accept=".txt">
                            </div>
                            
                            <textarea id="fc-source-text" placeholder="Or paste your study text here..." style="
                                width: 100%; height: 180px; padding: 16px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: var(--text); resize: vertical; margin-bottom: 20px; font-family: inherit; font-size: 0.95rem;
                            "></textarea>

                            <button id="fc-generate-btn" class="btn-primary" style="width: 100%; padding: 14px; justify-content: center; font-size: 1.05rem; border-radius: 8px;">
                                <i class="fa-solid fa-wand-magic-sparkles"></i> Generate Flashcards
                            </button>
                        </div>

                        <div id="fc-viewer-section" style="display: none; flex-direction: column; align-items: center;">
                            <div style="display: flex; justify-content: space-between; width: 100%; align-items: center; margin-bottom: 16px; padding: 0 10px;">
                                <h3 id="fc-viewer-title" style="margin: 0; color: var(--text); font-size: 1.2rem;">Your Deck</h3>
                                <select id="fc-mode-select" style="padding: 8px 12px; border-radius: 8px; background: var(--bg-tertiary); color: var(--text); border: 1px solid var(--border-color); cursor: pointer; font-size: 0.95rem;">
                                    <option value="word-to-def">Word &rarr; Definition</option>
                                    <option value="def-to-word">Definition &rarr; Word</option>
                                    <option value="mix">Mix (Randomized)</option>
                                </select>
                            </div>

                            <div class="fc-scene" id="fc-scene">
                                <div class="fc-card" id="fc-card">
                                    <div class="fc-face fc-face-front" id="fc-front-text">Front</div>
                                    <div class="fc-face fc-face-back" id="fc-back-text">Back</div>
                                </div>
                            </div>

                            <div style="display: flex; align-items: center; justify-content: center; gap: 24px; margin-top: 10px; width: 100%;">
                                <button class="fc-nav-btn" id="fc-prev-btn" style="flex: 1; max-width: 120px;"><i class="fa-solid fa-arrow-left"></i> Prev</button>
                                <span id="fc-counter" style="color: var(--text-secondary); font-weight: 600; font-size: 1.1rem; font-variant-numeric: tabular-nums; min-width: 60px; text-align: center;">0 / 0</span>
                                <button class="fc-nav-btn" id="fc-next-btn" style="flex: 1; max-width: 120px;">Next <i class="fa-solid fa-arrow-right"></i></button>
                            </div>
                            
                            <button id="fc-reset-btn" class="btn-secondary" style="margin-top: 40px; padding: 10px 24px; border-radius: 8px;">
                                <i class="fa-solid fa-plus"></i> Create Another Deck
                            </button>
                        </div>

                        <div id="fc-library-section" style="display: none;">
                            <h3 style="margin-top: 0; color: var(--text); font-size: 1.3rem; margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">Saved Decks</h3>
                            <div id="fc-library-list">
                                </div>
                        </div>

                    </div>
                `;
                container.appendChild(wrapper);

                // -------------------------------------------------------
                // DOM ELEMENTS
                // -------------------------------------------------------
                const fileInput = container.querySelector('#fc-file-upload');
                const sourceText = container.querySelector('#fc-source-text');
                const generateBtn = container.querySelector('#fc-generate-btn');

                const inputSection = container.querySelector('#fc-input-section');
                const viewerSection = container.querySelector('#fc-viewer-section');
                const librarySection = container.querySelector('#fc-library-section');

                const viewerTitle = container.querySelector('#fc-viewer-title');
                const cardEl = container.querySelector('#fc-card');
                const frontText = container.querySelector('#fc-front-text');
                const backText = container.querySelector('#fc-back-text');
                const prevBtn = container.querySelector('#fc-prev-btn');
                const nextBtn = container.querySelector('#fc-next-btn');
                const counter = container.querySelector('#fc-counter');
                const modeSelect = container.querySelector('#fc-mode-select');
                const resetBtn = container.querySelector('#fc-reset-btn');

                const toggleLibraryBtn = container.querySelector('#fc-toggle-library-btn');
                const libraryList = container.querySelector('#fc-library-list');

                // View Switching Logic
                const showSection = (section) => {
                    inputSection.style.display = 'none';
                    viewerSection.style.display = 'none';
                    librarySection.style.display = 'none';
                    section.style.display = (section === viewerSection) ? 'flex' : 'block';
                };

                // -------------------------------------------------------
                // LIBRARY RENDER & ACTIONS (Native Modals Added)
                // -------------------------------------------------------
                const renderLibrary = () => {
                    if (savedDecks.length === 0) {
                        libraryList.innerHTML = `<p style="color: var(--text-muted); text-align: center; margin-top: 40px; font-style: italic;">You don't have any saved decks yet. Create one to get started!</p>`;
                        return;
                    }

                    libraryList.innerHTML = savedDecks.map(deck => `
                        <div class="fc-deck-item">
                            <div class="fc-deck-info">
                                <h4>${deck.name}</h4>
                                <p>${deck.cards.length} cards &bull; Created ${new Date(deck.date).toLocaleDateString()}</p>
                            </div>
                            <div class="fc-deck-actions">
                                <button class="fc-icon-btn load-deck" data-id="${deck.id}" title="Study Deck"><i class="fa-solid fa-play"></i></button>
                                <button class="fc-icon-btn rename-deck" data-id="${deck.id}" title="Rename Deck"><i class="fa-solid fa-pen"></i></button>
                                <button class="fc-icon-btn delete delete-deck" data-id="${deck.id}" title="Delete Deck"><i class="fa-solid fa-trash"></i></button>
                            </div>
                        </div>
                    `).join('');
                };

                libraryList.addEventListener('click', (e) => {
                    const target = e.target.closest('.fc-icon-btn');
                    if (!target) return;

                    const deckId = target.getAttribute('data-id');
                    const deckIndex = savedDecks.findIndex(d => d.id === deckId);
                    if (deckIndex === -1) return;

                    const deck = savedDecks[deckIndex];

                    // LOAD DECK
                    if (target.classList.contains('load-deck')) {
                        activeDeck = deck;
                        currentIndex = 0;
                        viewerTitle.innerText = activeDeck.name;
                        showSection(viewerSection);
                        updateCardView();
                        toggleLibraryBtn.innerHTML = '<i class="fa-solid fa-book-bookmark"></i> My Decks';
                    }

                    // RENAME DECK (Native Modal)
                    else if (target.classList.contains('rename-deck')) {
                        api.ui.createModal({
                            title: 'Rename Deck',
                            icon: 'fa-pen',
                            contentHtml: `
                                <div style="margin-bottom: 8px; color: var(--text-secondary); font-size: 0.9rem;">Enter a new name for this deck:</div>
                                <input type="text" id="fc-rename-input" value="${deck.name}" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: var(--text); font-size: 1rem;">
                            `,
                            saveText: 'Save',
                            cancelText: 'Cancel',
                            onSave: () => {
                                const inputEl = document.getElementById('fc-rename-input');
                                if (inputEl && inputEl.value.trim() !== '') {
                                    deck.name = inputEl.value.trim();
                                    saveToStorage();
                                    renderLibrary();
                                    api.ui.showToast('Deck renamed successfully!', 'success');

                                    // Live update title if it's currently open
                                    if (activeDeck && activeDeck.id === deck.id) {
                                        viewerTitle.innerText = deck.name;
                                    }
                                }
                            },
                            onCancel: () => { }
                        });
                    }

                    // DELETE DECK (Native Modal)
                    else if (target.classList.contains('delete-deck')) {
                        api.ui.createModal({
                            title: 'Delete Deck',
                            icon: 'fa-trash',
                            contentHtml: `<p style="color: var(--text); margin: 0;">Are you sure you want to delete the deck "<strong>${deck.name}</strong>"? This action cannot be undone.</p>`,
                            saveText: 'Delete',
                            cancelText: 'Cancel',
                            onSave: () => {
                                savedDecks.splice(deckIndex, 1);
                                saveToStorage();
                                renderLibrary();
                                api.ui.showToast('Deck deleted.', 'info');

                                // Boot them out if they were actively studying it
                                if (activeDeck && activeDeck.id === deck.id) {
                                    activeDeck = null;
                                    // If no decks left, bounce back to the create screen
                                    if (savedDecks.length === 0) {
                                        toggleLibraryBtn.innerHTML = '<i class="fa-solid fa-book-bookmark"></i> My Decks';
                                        showSection(inputSection);
                                    }
                                }
                            },
                            onCancel: () => { }
                        });
                    }
                });

                toggleLibraryBtn.addEventListener('click', () => {
                    if (librarySection.style.display === 'block') {
                        // Go back to input (or viewer if one is active)
                        toggleLibraryBtn.innerHTML = '<i class="fa-solid fa-book-bookmark"></i> My Decks';
                        showSection(activeDeck ? viewerSection : inputSection);
                    } else {
                        // Open library
                        toggleLibraryBtn.innerHTML = '<i class="fa-solid fa-arrow-left"></i> Back';
                        renderLibrary();
                        showSection(librarySection);
                    }
                });


                // -------------------------------------------------------
                // AI GENERATION
                // -------------------------------------------------------
                fileInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (evt) => { sourceText.value = evt.target.result; };
                        reader.readAsText(file);
                    }
                });

                generateBtn.addEventListener('click', async () => {
                    const text = sourceText.value.trim();
                    if (!text) {
                        api.ui.showToast('Please provide some text first!', 'error');
                        return;
                    }

                    try {
                        generateBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Generating...';
                        generateBtn.disabled = true;
                        api.ui.showToast('Analyzing text and naming deck...', 'info');

                        // Prompt asks for an Object with a "title" and "cards" array
                        const systemPrompt = `You are a strict educational assistant. Analyze the user's text and extract 3 to 15 key concepts to create flashcards. 
                        You MUST respond ONLY with a valid, raw JSON object. Do not include markdown formatting.
                        Format: {"title": "A highly descriptive, short name for this topic", "cards": [{"word": "Concept", "definition": "Explanation."}]}`;

                        const response = await api.ai.generate(systemPrompt, text);

                        let cleanJson = response.replace(/^```json/i, '').replace(/```$/i, '').trim();
                        const parsedData = JSON.parse(cleanJson);

                        if (!parsedData.cards || !Array.isArray(parsedData.cards) || parsedData.cards.length === 0) {
                            throw new Error('AI did not return a valid array of cards.');
                        }

                        // Prepare mix states
                        parsedData.cards = parsedData.cards.map(c => ({
                            ...c, isReversedInMix: Math.random() > 0.5
                        }));

                        // Create Deck Object
                        const newDeck = {
                            id: 'deck-' + Date.now(),
                            name: parsedData.title || 'Untitled Deck',
                            date: new Date().toISOString(),
                            cards: parsedData.cards
                        };

                        // Save and load
                        savedDecks.unshift(newDeck);
                        saveToStorage();

                        activeDeck = newDeck;
                        currentIndex = 0;
                        viewerTitle.innerText = activeDeck.name;

                        showSection(viewerSection);
                        updateCardView();

                        // Reset input UI
                        sourceText.value = '';
                        fileInput.value = '';
                        toggleLibraryBtn.innerHTML = '<i class="fa-solid fa-book-bookmark"></i> My Decks';

                        api.ui.showToast(`Saved "${activeDeck.name}" with ${activeDeck.cards.length} cards!`, 'success');

                    } catch (err) {
                        api.ui.showToast('Failed to parse AI response. Try again.', 'error');
                        console.error('Flashcard error:', err);
                    } finally {
                        generateBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate Flashcards';
                        generateBtn.disabled = false;
                    }
                });

                // -------------------------------------------------------
                // VIEWER LOGIC
                // -------------------------------------------------------
                const updateCardView = () => {
                    if (!activeDeck || activeDeck.cards.length === 0) return;

                    cardEl.classList.remove('is-flipped');

                    const cardData = activeDeck.cards[currentIndex];
                    let front = cardData.word;
                    let back = cardData.definition;

                    if (currentMode === 'def-to-word') {
                        front = cardData.definition; back = cardData.word;
                    } else if (currentMode === 'mix') {
                        if (cardData.isReversedInMix) { front = cardData.definition; back = cardData.word; }
                    }

                    setTimeout(() => {
                        frontText.innerHTML = `<strong>${front}</strong>`;
                        backText.innerHTML = back;
                    }, 150);

                    counter.innerText = `${currentIndex + 1} / ${activeDeck.cards.length}`;
                    prevBtn.disabled = currentIndex === 0;
                    nextBtn.disabled = currentIndex === activeDeck.cards.length - 1;
                };

                cardEl.addEventListener('click', () => cardEl.classList.toggle('is-flipped'));

                prevBtn.addEventListener('click', () => {
                    if (currentIndex > 0) { currentIndex--; updateCardView(); }
                });

                nextBtn.addEventListener('click', () => {
                    if (currentIndex < activeDeck.cards.length - 1) { currentIndex++; updateCardView(); }
                });

                modeSelect.addEventListener('change', (e) => {
                    currentMode = e.target.value; updateCardView();
                });

                resetBtn.addEventListener('click', () => {
                    activeDeck = null;
                    showSection(inputSection);
                });
            }
        });
    }
});