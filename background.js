// Service worker for the TaskBoard extension.
// The app is a full-page board, so a tiny toolbar popup would be cramped.
// Clicking the toolbar icon opens the app in its own tab. This needs no
// extra permissions (opening an extension page by URL is always allowed).

chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
});

// Open a local file:// link. Page context can't navigate to file:// (blocked),
// but the service worker can via chrome.tabs.create (requires the "tabs"
// permission, "file:///*" host permission, and the user enabling
// "Allow access to file URLs" on the extension's details page).
chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === 'openLocalFile' && msg.url) {
        chrome.tabs.create({ url: msg.url });
    }
});
