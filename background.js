// Background script for vocabulary extension
let notificationIntervalId = null;
let selectedWords = [];
let isActive = false;
let wordIndexToNoti = 1;
let popupIsOpen = false;

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    switch (request.action) {
        case 'startNotifications':
            startNotifications(request.interval, request.words, request.mode);
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
function startNotifications(interval, words, mode) {
    selectedWords = words;
    isActive = true;
    wordIndexToNoti = 1;

    // Clear any existing interval
    if (notificationIntervalId) {
        clearInterval(notificationIntervalId);
    }

    // Set up new interval
    notificationIntervalId = setInterval(() => {
        if (selectedWords.length === 0) {
            return;
        }

        let wordToNoti;
        if (mode === 'random') {
            wordToNoti = selectedWords[Math.floor(Math.random() * selectedWords.length)];
        } else {
            wordToNoti = selectedWords[wordIndexToNoti % selectedWords.length];
            wordIndexToNoti++;
        }

        showWordNotification(wordToNoti.word);
        updateLastNotifiedWordId(wordToNoti);
    }, interval);

    console.log('Notifications started with interval:', interval);
}

function updateLastNotifiedWordId(word) {
    chrome.storage.local.set({lastNotifiedWordId: word.id}).catch(e => `error set storage: ${e}`)
    chrome.runtime.sendMessage({action: 'updateLastNotifiedWordId'}).catch(e => `error push event updateLastNotifiedWordId: ${e}`)
}

// Stop notification system
function stopNotifications() {
    isActive = false;

    if (notificationIntervalId) {
        clearInterval(notificationIntervalId);
        notificationIntervalId = null;
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
        iconUrl: 'learn-language-icon.png',
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

// connect to port when popup open
chrome.runtime.onConnect.addListener(port => {
    if (port.name !== "popup_open") {
        return;
    }

    popupIsOpen = true;

    port.onDisconnect.addListener(() => {
        popupIsOpen = false;
    });
});

// Handle notification clicks
chrome.notifications.onClicked.addListener(function (notificationId) {
    if (notificationId !== 'vocabulary-notification')
        return;

    if (popupIsOpen)
        return;

    // Open popup when notification is clicked
    chrome.action.openPopup()
        .then(() => {
            popupIsOpen = true;
        })
        .catch(e => console.error(`==> error when opening popup: ${e.message}`));
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
        const defaultDecks = [];

        const defaultWords = [];

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