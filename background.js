// Thay thế toàn bộ background.js
let popupIsOpen = false;

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function (request) {
    if (request.action === 'startNotifications') {
        startNotifications(request.interval, request.words, request.mode);
    } else if (request.action === 'stopNotifications') {
        stopNotifications();
    }
});

// Listen for alarm events
chrome.alarms.onAlarm.addListener(function (alarm) {
    if (alarm.name === 'vocabularyNotification') {
        showWordNotification();
    }
});

function startNotifications(intervalMs, words, mode) {
    // Clear any existing alarms
    chrome.alarms.clear('vocabularyNotification').then();

    // Create new alarm with interval in minutes
    const intervalMinutes = intervalMs / (1000 * 60);
    chrome.alarms.create('vocabularyNotification', {
        delayInMinutes: 1, // Show first notification after 6 seconds
        periodInMinutes: intervalMinutes
    }).then();

    // Save state
    chrome.storage.local.set({
        isNotificationActive: true,
        notificationWords: words,
        notificationMode: mode,
        currentNotificationIndex: 0
    });
}

function stopNotifications() {
    // Clear the alarm
    chrome.alarms.clear('vocabularyNotification').then();

    // Clear state
    chrome.storage.local.set({
        isNotificationActive: false
    });

    // Notify popup that notifications stopped
    chrome.runtime.sendMessage({
        action: 'notificationStopped'
    }).catch((e) => {
        // Ignore error if popup is closed
        console.log(e)
    });
}

function showWordNotification() {
    chrome.storage.local.get(['notificationWords', 'notificationMode', 'currentNotificationIndex'],
        function (result) {
            let notificationWords = result.notificationWords;
            let currentNotificationIndex = result.currentNotificationIndex;
            let notificationMode = result.notificationMode;
            if (notificationWords.length === 0) return;

            let selectedWord;

            if (notificationMode === 'sequential') {
                selectedWord = notificationWords[currentNotificationIndex % notificationWords.length];
                currentNotificationIndex++;

                // Save updated index
                chrome.storage.local.set({
                    currentNotificationIndex: currentNotificationIndex
                }).then();
            } else {
                selectedWord = notificationWords[Math.floor(Math.random() * notificationWords.length)];
            }

            showNotification(selectedWord.word, selectedWord.id);
        });
}

function showNotification(word, wordId) {
    chrome.notifications.create('vocabulary-notification', {
        type: 'basic',
        iconUrl: 'logo.png',
        title: 'Vocabulary Reminder',
        message: word,
        priority: 1
    }).then();

    // Save last notified word
    chrome.storage.local.set({lastNotifiedWordId: wordId}).then();
    chrome.runtime.sendMessage({action: 'updateLastNotifiedWordId'})
        .catch(e => `error push event updateLastNotifiedWordId: ${e}`)
}

// Restore notification state on startup
chrome.runtime.onStartup.addListener(function () {
    restoreNotificationState();
});

chrome.runtime.onInstalled.addListener(function () {
    restoreNotificationState();
});

function restoreNotificationState() {
    chrome.storage.local.get(['isNotificationActive', 'notificationWords', 'notificationMode', 'currentNotificationIndex', 'notificationSettings'], function (result) {
        if (result.isNotificationActive && result.notificationWords && result.notificationWords.length > 0) {
            // Restore alarm if it was active
            const settings = result.notificationSettings || {timeValue: 20, timeUnit: 'minutes'};
            let intervalMs;

            switch (settings.timeUnit) {
                case 'seconds':
                    intervalMs = settings.timeValue * 1000;
                    break;
                case 'minutes':
                    intervalMs = settings.timeValue * 60 * 1000;
                    break;
                case 'hours':
                    intervalMs = settings.timeValue * 60 * 60 * 1000;
                    break;
                default:
                    intervalMs = 20 * 60 * 1000;
            }

            startNotifications(intervalMs, result.notificationWords, result.notificationMode || 'random');
        }
    });
}


// Handle notification clicks
chrome.notifications.onClicked.addListener(function (notificationId) {
    if (notificationId !== 'vocabulary-notification')
        return;

    chrome.notifications.clear('vocabulary-notification').then();

    if (popupIsOpen)
        return;

    // Open popup when notification is clicked
    chrome.action.openPopup()
        .then(() => {
            popupIsOpen = true;
        })
        .catch(e => console.error(`==> error when opening popup: ${e.message}`));
});

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