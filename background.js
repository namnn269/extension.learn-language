// Background script for vocabulary extension
let notificationInterval = null;
let selectedWords = [];
let isActive = false;

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    switch (request.action) {
        case 'startNotifications':
            startNotifications(request.interval, request.words);
            break;
        case 'stopNotifications':
            stopNotifications();
            break;
        case 'showNotification':
            showWordNotification(request.word);
            break;
    }
});

// Start notification system
function startNotifications(interval, words) {
    selectedWords = words;
    isActive = true;

    // Clear any existing interval
    if (notificationInterval) {
        clearInterval(notificationInterval);
    }

    // Set up new interval
    notificationInterval = setInterval(() => {
        if (selectedWords.length > 0) {
            const randomWord = selectedWords[Math.floor(Math.random() * selectedWords.length)];
            showWordNotification(randomWord.word);
        }
    }, interval);

    console.log('Notifications started with interval:', interval);
}

// Stop notification system
function stopNotifications() {
    isActive = false;

    if (notificationInterval) {
        clearInterval(notificationInterval);
        notificationInterval = null;
    }

    // Clear any existing notifications
    chrome.notifications.clear('vocabulary-notification');

    // Notify popup that notifications stopped
    chrome.runtime.sendMessage({action: 'notificationStopped'});

    console.log('Notifications stopped');
}

// Show word notification
function showWordNotification(word) {
    if (!word) return;

    chrome.notifications.create('vocabulary-notification', {
        type: 'basic',
        iconUrl: 'icon48.png',
        title: 'Vocabulary Learning',
        message: word,
        priority: 1
    }, function (notificationId) {
        if (chrome.runtime.lastError) {
            console.error('Notification error:', chrome.runtime.lastError);
        } else {
            console.log('Notification shown:', word);
        }
    });
}

// Handle notification clicks
chrome.notifications.onClicked.addListener(function (notificationId) {
    if (notificationId === 'vocabulary-notification') {
        // Open popup when notification is clicked
        chrome.action.openPopup();
    }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(function () {
    // Check if notifications were active before restart
    chrome.storage.local.get(['isNotificationActive', 'notificationInterval', 'selectedWords'], function (result) {
        if (result.isNotificationActive && result.notificationInterval && result.selectedWords) {
            startNotifications(result.notificationInterval, result.selectedWords);
        }
    });
});

// Handle extension install
chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason === 'install') {
        console.log('Vocabulary Extension installed');

        // Initialize default data
        const defaultDecks = [
            {id: 1, name: 'Basic Words'},
            {id: 2, name: 'Advanced Words'},
            {id: 3, name: 'Business English'},
            {id: 4, name: 'Daily Conversation'}
        ];

        const defaultWords = [
            {id: 1, deckId: 1, word: 'Hello', ipa: '/həˈloʊ/', meaning: 'Xin chào', example: 'Hello, how are you?'},
            {id: 2, deckId: 1, word: 'World', ipa: '/wɜːrld/', meaning: 'Thế giới', example: 'Welcome to the world.'},
            {id: 3, deckId: 2, word: 'Beautiful', ipa: '/ˈbjuːtɪfəl/', meaning: 'Đẹp', example: 'She is beautiful.'},
            {
                id: 4,
                deckId: 2,
                word: 'Wonderful',
                ipa: '/ˈwʌndərfəl/',
                meaning: 'Tuyệt vời',
                example: 'What a wonderful day!'
            }
        ];

        chrome.storage.local.set({
            decks: defaultDecks,
            words: defaultWords,
            notificationSettings: {
                timeValue: 20,
                timeUnit: 'minutes'
            }
        });
    }
});

// Handle browser action click (when extension icon is clicked)
chrome.action.onClicked.addListener(function (tab) {
    // This will open the popup
    chrome.action.openPopup();
});

// Periodic cleanup of old notifications
setInterval(() => {
    chrome.notifications.getAll((notifications) => {
        Object.keys(notifications).forEach((notificationId) => {
            if (notificationId !== 'vocabulary-notification') {
                chrome.notifications.clear(notificationId);
            }
        });
    });
}, 60000); // Clean up every minute

// Handle tab updates to maintain notification state
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && isActive) {
        // Ensure notifications continue running even when tabs change
        chrome.storage.local.get(['isNotificationActive'], function (result) {
            if (!result.isNotificationActive && isActive) {
                chrome.storage.local.set({isNotificationActive: true});
            }
        });
    }
});

// Handle system suspend/resume
chrome.idle.onStateChanged.addListener(function (state) {
    if (state === 'active' && isActive) {
        // Resume notifications when system becomes active
        chrome.storage.local.get(['notificationInterval', 'selectedWords'], function (result) {
            if (result.notificationInterval && result.selectedWords) {
                startNotifications(result.notificationInterval, result.selectedWords);
            }
        });
    }
});