// Global variables
let decks = [
    {id: 1, name: 'Deck 1', words: []},
    {id: 2, name: 'Deck 2', words: []},
    {id: 3, name: 'Deck 3', words: []},
    {id: 4, name: 'Deck 4', words: []}
];

let words = [
    {id: 1, deckId: 1, word: 'School', ipa: '/skuːl/', meaning: 'Trường học', example: 'I go to school every day.'},
    {id: 2, deckId: 2, word: 'Rule', ipa: '/ruːl/', meaning: 'Quy tắc', example: 'Follow the rules.'},
    {id: 3, deckId: 3, word: 'Table', ipa: '/ˈteɪbəl/', meaning: 'Bàn', example: 'Put the book on the table.'},
    {id: 4, deckId: 4, word: 'Chair', ipa: '/tʃeər/', meaning: 'Ghế', example: 'Sit on the chair.'}
];

let selectedWords = [];
let selectedWordId = null;
let isNotificationActive = false;
let notificationInterval = null;
let currentEditingWordId = null;

// API Keys (you need to get these from respective services)
const DICTIONARY_API_KEY = 'your-dictionary-api-key';
const GOOGLE_TRANSLATE_API_KEY = 'your-google-translate-api-key';

// DOM elements
const newDeckBtn = document.getElementById('newDeckBtn');
const newWordBtn = document.getElementById('newWordBtn');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const listenBtn = document.getElementById('listenBtn');
const detailBtn = document.getElementById('detailBtn');
const updateBtn = document.getElementById('updateBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');

// Modal elements
const newDeckModal = document.getElementById('newDeckModal');
const newWordModal = document.getElementById('newWordModal');
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

// Listen buttons
const listenNewWordBtn = document.getElementById('listenNewWordBtn');
const listenIpaBtn = document.getElementById('listenIpaBtn');
const listenMeaningBtn = document.getElementById('listenMeaningBtn');
const listenExampleBtn = document.getElementById('listenExampleBtn');

// Initialize
document.addEventListener('DOMContentLoaded', function () {
    loadData();
    updateUI();
    bindEvents();
    updateButtonStates();
    checkNotificationState();
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

    // Modal buttons
    saveDeckBtn.addEventListener('click', saveDeck);
    cancelDeckBtn.addEventListener('click', closeNewDeckModal);
    saveWordBtn.addEventListener('click', saveWord);
    cancelWordBtn.addEventListener('click', closeNewWordModal);

    // Listen buttons
    listenNewWordBtn.addEventListener('click', () => speakText(newWordInput.value));
    listenIpaBtn.addEventListener('click', () => speakText(ipaInput.value));
    listenMeaningBtn.addEventListener('click', () => speakText(meaningInput.value, 'vi'));
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
        if (e.target.closest('.vocabulary-item')) {
            selectVocabularyItem(e.target.closest('.vocabulary-item'));
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
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeNewDeckModal();
            closeNewWordModal();
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
    chrome.storage.local.get(['decks', 'words', 'notificationSettings'], function (result) {
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
        updateUI();
    });
}

function saveData() {
    chrome.storage.local.set({decks, words});
}

function checkNotificationState() {
    chrome.storage.local.get(['isNotificationActive'], function (result) {
        if (result.isNotificationActive) {
            isNotificationActive = true;
            updateButtonStates();
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
          </label>
      `;

        deckListSection.appendChild(deckItem);
    });
}

function updateVocabularyList() {
    const selectedDeckIds = getSelectedDeckIds();
    selectedWords = words.filter(word => selectedDeckIds.includes(word.deckId));

    const vocabularyList = document.querySelector('.vocabulary-list');
    vocabularyList.innerHTML = '';

    selectedWords.forEach(word => {
        const wordItem = document.createElement('div');
        wordItem.className = 'vocabulary-item';
        wordItem.dataset.wordId = word.id;

        wordItem.innerHTML = `<span class="word-text">${word.word}</span>`;

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
    deckSelect.innerHTML = '<option value="">Chọn deck</option>';
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
}

function updateSelectedWordUI() {
    document.querySelectorAll('.vocabulary-item').forEach(item => {
        item.classList.remove('selected');
        if (parseInt(item.dataset.wordId) === selectedWordId) {
            item.classList.add('selected');
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

// Modal functions
function openNewDeckModal() {
    deckNameInput.value = '';
    newDeckModal.style.display = 'block';
    deckNameInput.focus();
}

function closeNewDeckModal() {
    newDeckModal.style.display = 'none';
}

function openNewWordModal() {
    wordModalTitle.textContent = 'New Word';
    currentEditingWordId = null;
    clearWordForm();
    newWordModal.style.display = 'block';
    newWordInput.focus();
}

function openWordDetailModal() {
    const word = getSelectedWord();
    if (!word) return;

    wordModalTitle.textContent = 'Chi tiết từ vựng';
    currentEditingWordId = word.id;
    fillWordForm(word);
    setWordFormReadonly(true);
    newWordModal.style.display = 'block';
}

function openWordUpdateModal() {
    const word = getSelectedWord();
    if (!word) return;

    wordModalTitle.textContent = 'Cập nhật từ vựng';
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

    // IPA is always readonly
    ipaInput.readOnly = true;
}

// Save functions
function saveDeck() {
    const deckName = deckNameInput.value.trim();
    if (!deckName) {
        alert('Vui lòng nhập tên deck');
        return;
    }

    // Check for duplicate names
    if (decks.some(deck => deck.name.toLowerCase() === deckName.toLowerCase())) {
        alert('Tên deck đã tồn tại');
        return;
    }

    const newDeck = {
        id: Date.now(),
        name: deckName
    };

    decks.push(newDeck);
    saveData();
    updateUI();
    closeNewDeckModal();
}

function saveWord() {
    const deckId = parseInt(deckSelect.value);
    const word = newWordInput.value.trim();
    const ipa = ipaInput.value.trim();
    const meaning = meaningInput.value.trim();
    const example = exampleInput.value.trim();

    if (!deckId || !word || !meaning) {
        alert('Vui lòng điền đầy đủ thông tin bắt buộc');
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
            alert('Từ này đã tồn tại trong deck');
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
    }

    saveData();
    updateUI();
    closeNewWordModal();
}

function saveNotificationSettings() {
    const timeValue = parseInt(document.getElementById('timeValue').value);
    const timeUnit = document.getElementById('timeUnit').value;

    if (!timeValue || timeValue < 1) {
        alert('Vui lòng nhập thời gian hợp lệ');
        return;
    }

    const settings = {timeValue, timeUnit};
    chrome.storage.local.set({notificationSettings: settings}, function () {
        alert('Đã lưu cài đặt thông báo');
    });
}

// Word input change handler with API integration
async function onWordInputChange() {
    const word = newWordInput.value.trim();
    if (word.length < 2) return;

    try {
        // Show loading state
        newWordInput.classList.add('loading');

        // Fetch word data from APIs
        const [dictionaryData, translationData] = await Promise.all([
            fetchFromDictionaryAPI(word),
            fetchFromGoogleTranslate(word)
        ]);

        // Update form with fetched data
        if (dictionaryData) {
            ipaInput.value = dictionaryData.phonetic || '';
            if (dictionaryData.meanings && dictionaryData.meanings.length > 0) {
                const firstMeaning = dictionaryData.meanings[0];
                if (firstMeaning.definitions && firstMeaning.definitions.length > 0) {
                    exampleInput.value = firstMeaning.definitions[0].example || '';
                }
            }
        }

        if (translationData) {
            meaningInput.value = translationData.translatedText || '';
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

// Google Translate API integration
async function fetchFromGoogleTranslate(word) {
    try {
        // Note: This requires a valid API key and proper CORS setup
        const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TRANSLATE_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                q: word,
                source: 'en',
                target: 'vi',
                format: 'text'
            })
        });

        if (!response.ok) throw new Error('Google Translate API error');

        const data = await response.json();
        if (data && data.data && data.data.translations && data.data.translations.length > 0) {
            return {
                translatedText: data.data.translations[0].translatedText
            };
        }
        return null;
    } catch (error) {
        console.error('Google Translate API error:', error);
        // Fallback to a simple translation service or mock data
        return await fetchFallbackTranslation(word);
    }
}

// Fallback translation function
async function fetchFallbackTranslation(word) {
    // Simple mock translations for common words
    const mockTranslations = {
        'hello': 'xin chào',
        'world': 'thế giới',
        'book': 'sách',
        'computer': 'máy tính',
        'school': 'trường học',
        'student': 'học sinh',
        'teacher': 'giáo viên',
        'house': 'ngôi nhà',
        'car': 'xe hơi',
        'phone': 'điện thoại',
        'water': 'nước',
        'food': 'thức ăn',
        'time': 'thời gian',
        'money': 'tiền',
        'work': 'công việc',
        'family': 'gia đình',
        'friend': 'bạn bè',
        'love': 'tình yêu',
        'happy': 'hạnh phúc',
        'beautiful': 'đẹp'
    };

    const translation = mockTranslations[word.toLowerCase()];
    return translation ? {translatedText: translation} : null;
}

// Text-to-speech function
function speakText(text, lang = 'en-US') {
    if (!text) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.8;
    utterance.volume = 0.8;

    speechSynthesis.cancel(); // Cancel any ongoing speech
    speechSynthesis.speak(utterance);
}

// Notification functions
function startNotifications() {
    if (selectedWords.length === 0) {
        alert('Vui lòng chọn ít nhất một deck');
        return;
    }

    const timeValue = parseInt(document.getElementById('timeValue').value);
    const timeUnit = document.getElementById('timeUnit').value;

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

    isNotificationActive = true;
    updateButtonStates();

    // Show first notification immediately
    showRandomWordNotification();

    // Send message to background script to start notifications
    chrome.runtime.sendMessage({
        action: 'startNotifications',
        interval: intervalMs,
        words: selectedWords
    });

    // Save notification state
    chrome.storage.local.set({
        isNotificationActive: true,
        notificationInterval: intervalMs,
        selectedWords: selectedWords
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

function showRandomWordNotification() {
    if (selectedWords.length === 0) return;

    const randomWord = selectedWords[Math.floor(Math.random() * selectedWords.length)];

    // Send message to background script to show notification
    chrome.runtime.sendMessage({
        action: 'showNotification',
        word: randomWord.word
    });
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === 'notificationStopped') {
        isNotificationActive = false;
        updateButtonStates();
    }
});