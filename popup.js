// Global variables
let decks = [];
let words = [];
let selectedWords = [];
let selectedWordId = null;
let selectedDeckIds = [];
let isNotificationActive = false;
let notificationInterval = null;
let currentEditingWordId = null;
let confirmCallback = null;
let lastNotifiedWordId = null;
let currentEditingDeckId = null;

// DOM elements
const newDeckBtn = document.getElementById('newDeckBtn');
const newWordBtn = document.getElementById('newWordBtn');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const listenBtn = document.getElementById('listenBtn');
const detailBtn = document.getElementById('detailBtn');
const updateBtn = document.getElementById('updateBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const uncheckAllBtn = document.getElementById('uncheckAllBtn');

// Modal elements
const newDeckModal = document.getElementById('newDeckModal');
const newWordModal = document.getElementById('newWordModal');
const confirmModal = document.getElementById('confirmModal');
const deckNameInput = document.getElementById('deckNameInput');
const saveDeckBtn = document.getElementById('saveDeckBtn');
const cancelDeckBtn = document.getElementById('cancelDeckBtn');

// Word modal elements
const wordModalTitle = document.getElementById('wordModalTitle');
const deckSelect = document.getElementById('deckSelect');
const newWordInput = document.getElementById('newWordInput');
const ipaInput = document.getElementById('ipaInput');
const meaningInput = document.getElementById('meaningInput');
const exampleInput = document.getElementById('exampleInput');
const saveWordBtn = document.getElementById('saveWordBtn');
const cancelWordBtn = document.getElementById('cancelWordBtn');

// Confirm modal elements
const confirmTitle = document.getElementById('confirmTitle');
const confirmMessage = document.getElementById('confirmMessage');
const confirmYesBtn = document.getElementById('confirmYesBtn');
const confirmNoBtn = document.getElementById('confirmNoBtn');

// Listen buttons
const listenNewWordBtn = document.getElementById('listenNewWordBtn');
const listenMeaningBtn = document.getElementById('listenMeaningBtn');
const listenExampleBtn = document.getElementById('listenExampleBtn');

// Initialize
document.addEventListener('DOMContentLoaded', function () {
    loadData();
    updateUI();
    bindEvents();
    updateButtonStates();
    checkNotificationState();
    checkLastNotifiedWord();
});

// Event bindings
function bindEvents() {
    // Main buttons
    newDeckBtn.addEventListener('click', openNewDeckModal);
    newWordBtn.addEventListener('click', openNewWordModal);
    startBtn.addEventListener('click', startNotifications);
    stopBtn.addEventListener('click', stopNotifications);
    listenBtn.addEventListener('click', () => speakText(getSelectedWord()?.word));
    detailBtn.addEventListener('click', openWordDetailModal);
    updateBtn.addEventListener('click', openWordUpdateModal);
    saveSettingsBtn.addEventListener('click', saveNotificationSettings);
    uncheckAllBtn.addEventListener('click', uncheckAllDecks);

    // Modal buttons
    saveDeckBtn.addEventListener('click', saveDeck);
    cancelDeckBtn.addEventListener('click', closeNewDeckModal);
    saveWordBtn.addEventListener('click', saveWord);
    cancelWordBtn.addEventListener('click', closeNewWordModal);

    // Confirm modal buttons
    confirmYesBtn.addEventListener('click', handleConfirmYes);
    confirmNoBtn.addEventListener('click', closeConfirmModal);

    // Listen buttons
    listenNewWordBtn.addEventListener('click', () => speakText(newWordInput.value));
    listenMeaningBtn.addEventListener('click', () => speakText(meaningInput.value));
    listenExampleBtn.addEventListener('click', () => speakText(exampleInput.value));

    // Word input change event
    newWordInput.addEventListener('input', debounce(onWordInputChange, 1000));

    // Deck checkboxes
    document.addEventListener('change', function (e) {
        if (e.target.classList.contains('deck-checkbox')) {
            updateSelectedDecks();
        }
    });

    // Vocabulary item selection
    document.addEventListener('click', function (e) {
        if (e.target.closest('.vocabulary-item') && !e.target.classList.contains('delete-word-btn')) {
            selectVocabularyItem(e.target.closest('.vocabulary-item'));
        }
    });

    // Delete buttons
    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('update-deck-btn')) {
            e.stopPropagation();
            const deckId = parseInt(e.target.dataset.deckId);
            openUpdateDeckModal(deckId);
        }
        if (e.target.classList.contains('delete-deck-btn')) {
            e.stopPropagation();
            const deckId = parseInt(e.target.dataset.deckId);
            confirmDeleteDeck(deckId);
        }
        if (e.target.classList.contains('word-text')) {
            e.stopPropagation();
            chrome.storage.local.set({lastNotifiedWordId: parseInt(e.target.dataset.wordId)});
        }
        if (e.target.classList.contains('delete-word-btn')) {
            e.stopPropagation();
            const wordId = parseInt(e.target.dataset.wordId);
            confirmDeleteWord(wordId);
        }
    });

    // Modal close on outside click
    window.addEventListener('click', function (e) {
        if (e.target === newDeckModal) {
            closeNewDeckModal();
        }
        if (e.target === newWordModal) {
            closeNewWordModal();
        }
        if (e.target === confirmModal) {
            closeConfirmModal();
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeNewDeckModal();
            closeNewWordModal();
            closeConfirmModal();
        }
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
            if (newDeckModal.style.display === 'block') {
                saveDeck();
            } else if (newWordModal.style.display === 'block') {
                saveWord();
            }
        }
    });
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Data management
function loadData() {
    chrome.storage.local.get(['decks', 'words', 'notificationSettings', 'selectedDeckIds', 'notificationMode'], function (result) {
        if (result.decks) {
            decks = result.decks;
        }
        if (result.words) {
            words = result.words;
        }
        if (result.notificationSettings) {
            document.getElementById('timeValue').value = result.notificationSettings.timeValue;
            document.getElementById('timeUnit').value = result.notificationSettings.timeUnit;
        }
        if (result.notificationMode) {
            const modeRadio = document.querySelector(`input[name="notificationMode"][value="${result.notificationMode}"]`);
            if (modeRadio) {
                modeRadio.checked = true;
            }
        }
        if (result.selectedDeckIds && result.selectedDeckIds.length > 0) {
            selectedDeckIds = result.selectedDeckIds;
            setTimeout(() => restoreSelectedDecks(), 100);
        }
        updateUI();
    });
}

function saveData() {
    const notificationMode = document.querySelector('input[name="notificationMode"]:checked')?.value || 'random';
    chrome.storage.local.set({
        decks,
        words,
        selectedDeckIds: getSelectedDeckIds(),
        notificationMode: notificationMode
    });
}

function restoreSelectedDecks() {
    selectedDeckIds.forEach(deckId => {
        const checkbox = document.querySelector(`.deck-checkbox[value="${deckId}"]`);
        if (checkbox) {
            checkbox.checked = true;
        }
    });
    updateSelectedDecks();
}

function checkNotificationState() {
    chrome.storage.local.get(['isNotificationActive'], function (result) {
        if (result.isNotificationActive) {
            isNotificationActive = true;
            updateButtonStates();
        }
    });
}

function checkLastNotifiedWord() {
    chrome.storage.local.get(['lastNotifiedWordId'], function (result) {
        if (result.lastNotifiedWordId) {
            lastNotifiedWordId = result.lastNotifiedWordId;
            // Auto-select the last notified word if it exists in current selection
            setTimeout(() => {
                if (selectedWords.find(w => w.id === lastNotifiedWordId)) {
                    selectedWordId = lastNotifiedWordId;
                    updateSelectedWordUI();
                    updateButtonStates();
                }
            }, 100);
        }
    });
}

// UI Updates
function updateUI() {
    updateDeckList();
    updateVocabularyList();
    updateDeckSelect();
    updateVocabularyCount();
    updateButtonStates();
}

function updateDeckList() {
    const deckListSection = document.querySelector('.deck-list-section');
    deckListSection.innerHTML = '';

    decks.forEach(deck => {
        const wordCount = words.filter(word => word.deckId === deck.id).length;
        const deckItem = document.createElement('div');
        deckItem.className = 'deck-item';
        deckItem.dataset.deckId = deck.id;

        deckItem.innerHTML = `
            <label class="deck-label">
                <input type="checkbox" class="deck-checkbox" value="${deck.id}">
                <span class="deck-name">${deck.name}</span>
                <span class="deck-count">${wordCount}</span>
                <div class="deck-actions">
                    <button class="update-deck-btn" data-deck-id="${deck.id}" title="Cập nhật deck">✎</button>
                    <button class="delete-deck-btn" data-deck-id="${deck.id}" title="Xóa deck">×</button>
                </div>
            </label>
        `;

        deckListSection.appendChild(deckItem);
    });
}

function updateVocabularyList() {
    const currentSelectedDeckIds = getSelectedDeckIds();
    selectedWords = words.filter(word => currentSelectedDeckIds.includes(word.deckId));

    const vocabularyList = document.querySelector('.vocabulary-list');
    vocabularyList.innerHTML = '';

    let deckId = null;
    selectedWords.forEach(word => {
        const deckHtml = word.deckId !== deckId ? `<span>${decks.find(e => e.id === word.deckId)?.name}</span><br/>` : null
        if (deckHtml) {
            const deckItem = document.createElement('div');
            deckItem.className = 'deck-vocabulary-item';
            deckItem.innerHTML = deckHtml;
            vocabularyList.appendChild(deckItem);
            deckId = word.deckId;
        }

        const wordItem = document.createElement('div');
        wordItem.className = 'vocabulary-item';
        wordItem.dataset.wordId = word.id;

        wordItem.innerHTML = `
          <span class="word-text" data-word-id="${word.id}">${word.word}</span>
          <button class="delete-word-btn" data-word-id="${word.id}" title="Delete">×</button>
      `;

        vocabularyList.appendChild(wordItem);
    });

    // Select first word if none selected or current selection is not in filtered list
    if (selectedWords.length > 0) {
        if (!selectedWordId || !selectedWords.find(w => w.id === selectedWordId)) {
            selectedWordId = selectedWords[0].id;
        }
        updateSelectedWordUI();
    } else {
        selectedWordId = null;
    }
}

function updateDeckSelect() {
    deckSelect.innerHTML = '<option value="">Select deck</option>';
    decks.forEach(deck => {
        const option = document.createElement('option');
        option.value = deck.id;
        option.textContent = deck.name;
        deckSelect.appendChild(option);
    });
}

function updateVocabularyCount() {
    const vocabularyCount = document.querySelector('.vocabulary-count');
    vocabularyCount.textContent = selectedWords.length;
}

function updateSelectedDecks() {
    updateVocabularyList();
    updateVocabularyCount();
    updateButtonStates();
    saveData(); // Save selected deck state
}

function updateSelectedWordUI() {
    document.querySelectorAll('.vocabulary-item').forEach(item => {
        item.classList.remove('selected');
        if (parseInt(item.dataset.wordId) === selectedWordId) {
            item.classList.add('selected');
            item.scrollIntoView({behavior: 'smooth', block: 'center'});
        }
    });
}

function updateButtonStates() {
    const hasSelectedDecks = getSelectedDeckIds().length > 0;
    const hasSelectedWord = selectedWordId !== null;

    // Update vocabulary action buttons
    listenBtn.disabled = !hasSelectedWord;
    detailBtn.disabled = !hasSelectedWord;
    updateBtn.disabled = !hasSelectedWord;

    // Update start button
    startBtn.disabled = !hasSelectedDecks || isNotificationActive;
    stopBtn.disabled = !isNotificationActive;

    // Update uncheck all button
    uncheckAllBtn.disabled = !hasSelectedDecks;

    // Update button visual states
    if (isNotificationActive) {
        startBtn.classList.add('status-active');
        stopBtn.classList.remove('status-inactive');
    } else {
        startBtn.classList.remove('status-active');
        stopBtn.classList.add('status-inactive');
    }
}

// Helper functions
function getSelectedDeckIds() {
    const checkboxes = document.querySelectorAll('.deck-checkbox:checked');
    return Array.from(checkboxes).map(cb => parseInt(cb.value));
}

function getSelectedWord() {
    return words.find(word => word.id === selectedWordId);
}

function selectVocabularyItem(item) {
    selectedWordId = parseInt(item.dataset.wordId);
    updateSelectedWordUI();
    updateButtonStates();
}

function getDefaultDeckForNewWord() {
    const currentSelectedDeckIds = getSelectedDeckIds();
    return currentSelectedDeckIds.length > 0 ? currentSelectedDeckIds[0] : (decks.length > 0 ? decks[0].id : null);
}

function uncheckAllDecks() {
    document.querySelectorAll('.deck-checkbox:checked').forEach(checkbox => {
        checkbox.checked = false;
    });
    updateSelectedDecks();
}

// Modal functions
function openNewDeckModal() {
    document.querySelector('#newDeckModal h3').textContent = 'New Deck';
    currentEditingDeckId = null;
    deckNameInput.value = '';
    newDeckModal.style.display = 'block';
    deckNameInput.focus();
}

function openUpdateDeckModal(deckId) {
    const deck = decks.find(d => d.id === deckId);
    if (!deck) return;

    document.querySelector('#newDeckModal h3').textContent = 'Update Deck';
    currentEditingDeckId = deckId;
    deckNameInput.value = deck.name;
    newDeckModal.style.display = 'block';
    deckNameInput.focus();
    deckNameInput.select(); // Select text để dễ edit
}


function closeNewDeckModal() {
    newDeckModal.style.display = 'none';
    currentEditingDeckId = null;
}

function openNewWordModal() {
    wordModalTitle.textContent = 'New Word';
    currentEditingWordId = null;
    clearWordForm();

    // Set default deck
    const defaultDeckId = getDefaultDeckForNewWord();
    if (defaultDeckId) {
        deckSelect.value = defaultDeckId;
    }

    newWordModal.style.display = 'block';
    newWordInput.focus();
}

function openWordDetailModal() {
    const word = getSelectedWord();
    if (!word) return;

    wordModalTitle.textContent = 'Vocabulary detail';
    currentEditingWordId = word.id;
    fillWordForm(word);
    setWordFormReadonly(true);
    newWordModal.style.display = 'block';
}

function openWordUpdateModal() {
    const word = getSelectedWord();
    if (!word) return;

    wordModalTitle.textContent = 'Update vocabulary';
    currentEditingWordId = word.id;
    fillWordForm(word);
    setWordFormReadonly(false);
    newWordModal.style.display = 'block';
    newWordInput.focus();
}

function closeNewWordModal() {
    newWordModal.style.display = 'none';
    setWordFormReadonly(false);
}

function clearWordForm() {
    deckSelect.value = '';
    newWordInput.value = '';
    ipaInput.value = '';
    meaningInput.value = '';
    exampleInput.value = '';
}

function fillWordForm(word) {
    deckSelect.value = word.deckId;
    newWordInput.value = word.word;
    ipaInput.value = word.ipa;
    meaningInput.value = word.meaning;
    exampleInput.value = word.example;
}

function setWordFormReadonly(readonly) {
    deckSelect.disabled = readonly;
    newWordInput.readOnly = readonly;
    meaningInput.readOnly = readonly;
    exampleInput.readOnly = readonly;
    ipaInput.readOnly = readonly;
}

// Confirmation modal functions
function showConfirmModal(title, message, callback) {
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    confirmCallback = callback;
    confirmModal.style.display = 'block';
}

function closeConfirmModal() {
    confirmModal.style.display = 'none';
    confirmCallback = null;
}

function handleConfirmYes() {
    if (confirmCallback) {
        confirmCallback();
    }
    closeConfirmModal();
}

function confirmDeleteDeck(deckId) {
    const deck = decks.find(d => d.id === deckId);
    if (!deck) return;

    const wordCount = words.filter(w => w.deckId === deckId).length;
    const message = wordCount > 0
        ? `Are you sure you want to delete the deck "${deck.name}"? This will remove ${wordCount} words from this deck.`
        : `Are you sure you want to delete the deck "${deck.name}"?`;

    showConfirmModal('Delete Deck', message, () => deleteDeck(deckId));
}

function confirmDeleteWord(wordId) {
    const word = words.find(w => w.id === wordId);
    if (!word) return;

    const deck = decks.find(d => d.id === word.deckId);
    const deckName = deck ? deck.name : 'Unknown Deck';

    showConfirmModal('Delete word', `Are you sure you want to delete the word "${word.word}" from deck "${deckName}"?`, () => deleteWord(wordId));
}

function deleteDeck(deckId) {
    // Remove deck
    decks = decks.filter(deck => deck.id !== deckId);

    // Remove all words in this deck
    words = words.filter(word => word.deckId !== deckId);

    // Update selected decks if this deck was selected
    const checkbox = document.querySelector(`.deck-checkbox[value="${deckId}"]`);
    if (checkbox && checkbox.checked) {
        checkbox.checked = false;
        updateSelectedDecks();
    }

    saveData();
    updateUI();
}

function deleteWord(wordId) {
    // Remove word
    words = words.filter(word => word.id !== wordId);

    // Update selected word if this word was selected
    if (selectedWordId === wordId) {
        selectedWordId = null;
    }

    saveData();
    updateUI();
}

// Save functions
function saveDeck() {
    const deckName = deckNameInput.value.trim();
    if (!deckName) {
        alert('Deck name is required');
        return;
    }

    if (currentEditingDeckId) {
        // Update existing deck
        // Check for duplicate names (exclude current deck)
        if (decks.some(deck => deck.id !== currentEditingDeckId && deck.name.toLowerCase() === deckName.toLowerCase())) {
            alert('Deck name existed!');
            return;
        }

        const deckIndex = decks.findIndex(d => d.id === currentEditingDeckId);
        if (deckIndex !== -1) {
            decks[deckIndex].name = deckName;
        }
    } else {
        // Create new deck
        // Check for duplicate names
        if (decks.some(deck => deck.name.toLowerCase() === deckName.toLowerCase())) {
            alert('Deck name existed!');
            return;
        }

        const newDeck = {
            id: Date.now(),
            name: deckName
        };
        decks.push(newDeck);
    }

    saveData();
    updateUI();
    closeNewDeckModal();

    // Restore selected decks after adding/updating deck
    setTimeout(() => restoreSelectedDecks(), 100);
}

function saveWord() {
    const deckId = parseInt(deckSelect.value);
    const word = newWordInput.value.trim();
    const ipa = ipaInput.value.trim();
    const meaning = meaningInput.value.trim();
    const example = exampleInput.value.trim();

    if (!deckId || !word) {
        alert('Please fill in the required fields!');
        return;
    }

    if (currentEditingWordId) {
        // Update existing word
        const wordIndex = words.findIndex(w => w.id === currentEditingWordId);
        if (wordIndex !== -1) {
            words[wordIndex] = {
                ...words[wordIndex],
                deckId,
                word,
                ipa,
                meaning,
                example
            };
        }
    } else {
        // Check for duplicate words in the same deck
        if (words.some(w => w.deckId === deckId && w.word.toLowerCase() === word.toLowerCase())) {
            alert('This word existed in the deck.');
            return;
        }

        // Create new word
        const newWord = {
            id: Date.now(),
            deckId,
            word,
            ipa,
            meaning,
            example
        };
        words.push(newWord);

        // sort word by deck id
        const deckOrder = {};
        decks.forEach((deck, index) => {
            deckOrder[deck.id] = index;
        })

        words.sort((w1, w2) => {
            const orderW1 = deckOrder[w1.deckId] ?? Infinity;
            const orderW2 = deckOrder[w2.deckId] ?? Infinity;
            return orderW1 - orderW2;
        })
    }

    saveData();
    updateUI();
    closeNewWordModal();

    // Restore selected decks and vocabulary after adding/updating word
    setTimeout(() => restoreSelectedDecks(), 100);
}

function saveNotificationSettings() {
    const timeValue = parseInt(document.getElementById('timeValue').value);
    const timeUnit = document.getElementById('timeUnit').value;
    const notificationMode = document.querySelector('input[name="notificationMode"]:checked')?.value || 'random';

    if (!timeValue || timeValue < 1) {
        alert('Time unit is invalid!');
        return;
    }

    // Validate minimum time for alarms
    let intervalMs;
    switch (timeUnit) {
        case 'seconds':
            intervalMs = timeValue * 1000;
            break;
        case 'minutes':
            intervalMs = timeValue * 60 * 1000;
            break;
        case 'hours':
            intervalMs = timeValue * 60 * 60 * 1000;
            break;
    }

    if (intervalMs < 60000) {
        alert('Minimum configuration time is 60 seconds!');
        return;
    }

    const settings = {timeValue, timeUnit};
    chrome.storage.local.set({
        notificationSettings: settings,
        notificationMode: notificationMode
    }, function () {
        alert('Successfully');
    });
}

// Word input change handler with API integration
async function onWordInputChange() {
    const word = newWordInput.value.trim();
    if (word.length < 2 || !/^[a-z]+$/i.test(word))
        return;

    try {
        // Show loading state
        newWordInput.classList.add('loading');

        // Fetch word data from APIs
        const dictionaryData = await fetchFromDictionaryAPI(word);

        // Update form with fetched data
        if (dictionaryData) {
            ipaInput.value = dictionaryData.phonetic || '';
            if (dictionaryData.meanings && dictionaryData.meanings.length > 0) {
                const firstMeaning = dictionaryData.meanings[0];
                if (firstMeaning.definitions && firstMeaning.definitions.length > 0) {
                    exampleInput.value = firstMeaning.definitions[0].example || '';
                    meaningInput.value = firstMeaning.definitions[0].definition || '';
                }
            }
        }

    } catch (error) {
        console.error('Error fetching word data:', error);
    } finally {
        newWordInput.classList.remove('loading');
    }
}

// Dictionary API integration
async function fetchFromDictionaryAPI(word) {
    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        if (!response.ok) throw new Error('Dictionary API error');

        const data = await response.json();
        if (data && data.length > 0) {
            return data[0];
        }
        return null;
    } catch (error) {
        console.error('Dictionary API error:', error);
        return null;
    }
}

// Text-to-speech function
function speakText(text, lang = 'en-US') {
    if (!text) return;

    const utterance = new SpeechSynthesisUtterance(text.toLowerCase());
    utterance.lang = lang;
    utterance.rate = 0.8;
    utterance.volume = 0.8;

    speechSynthesis.cancel(); // Cancel any ongoing speech
    speechSynthesis.speak(utterance);
}

// Notification functions
function startNotifications() {
    if (selectedWords.length === 0) {
        alert('Select at least one deck');
        return;
    }

    const timeValue = parseInt(document.getElementById('timeValue').value);
    const timeUnit = document.getElementById('timeUnit').value;
    const notificationMode = document.querySelector('input[name="notificationMode"]:checked')?.value || 'random';

    let intervalMs;
    switch (timeUnit) {
        case 'seconds':
            intervalMs = timeValue * 1000;
            break;
        case 'minutes':
            intervalMs = timeValue * 60 * 1000;
            break;
        case 'hours':
            intervalMs = timeValue * 60 * 60 * 1000;
            break;
        default:
            intervalMs = 20 * 60 * 1000; // Default 20 minutes
    }

    // Validate minimum interval (Chrome alarms minimum is 1 minute)
    if (intervalMs < 60000) {
        alert('Minimum configuration time is 60 seconds!');
        return;
    }

    isNotificationActive = true;
    updateButtonStates();

    // Send message to background script to start notifications
    chrome.runtime.sendMessage({
        action: 'startNotifications',
        interval: intervalMs,
        words: selectedWords,
        mode: notificationMode
    });

    // Save notification state
    chrome.storage.local.set({
        isNotificationActive: true,
        notificationInterval: intervalMs,
        selectedWords: selectedWords,
        notificationMode: notificationMode
    });
}

function stopNotifications() {
    isNotificationActive = false;
    updateButtonStates();

    // Send message to background script to stop notifications
    chrome.runtime.sendMessage({
        action: 'stopNotifications'
    });

    // Clear notification state
    chrome.storage.local.set({
        isNotificationActive: false
    });
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === 'notificationStopped') {
        isNotificationActive = false;
        updateButtonStates();
    } else if (request.action === 'updateLastNotifiedWordId') {
        checkLastNotifiedWord();
    }
});

// trigger a sign to notify background that popup is open
chrome.runtime.connect({name: "popup_open"});