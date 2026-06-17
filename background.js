// Service worker for the TaskBoard extension.
// The app is a full-page board, so a tiny toolbar popup would be cramped.
// Clicking the toolbar icon opens the app in its own tab. This needs no
// extra permissions (opening an extension page by URL is always allowed).

chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
});

// Maps a file:// browser tab id to the TaskBoard tab id that opened it.
const openerTabByBrowserTab = new Map();
chrome.tabs.onRemoved.addListener((tabId) => openerTabByBrowserTab.delete(tabId));

// Open a local file:// link. Page context can't navigate to file:// (blocked),
// but the service worker can via chrome.tabs.create (requires the "tabs"
// permission, "file:///*" host permission, and the user enabling
// "Allow access to file URLs" on the extension's details page).
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.type === 'openLocalFile' && msg.url) {
        chrome.tabs.create({ url: msg.url });
        return;
    }

    // "Browse for file" flow: open Chrome's built-in file:// browser in a new
    // tab so the user can navigate the filesystem and pick a real path.
    if (msg && msg.type === 'openFileBrowser' && sender.tab) {
        const openerTabId = sender.tab.id;
        const mode = msg.mode || 'file';
        chrome.tabs.create({ url: 'file:///C:/', active: true }, (tab) => {
            openerTabByBrowserTab.set(tab.id, { openerTabId, mode });
        });
        sendResponse({ ok: true });
        return;
    }

    // fileBrowserPicker.js (content script on file:// pages) reports the
    // chosen path back; relay it to the TaskBoard tab that opened the browser.
    if (msg && msg.type === 'fileLinkSelected' && msg.url && sender.tab) {
        const browserTabId = sender.tab.id;
        const entry = openerTabByBrowserTab.get(browserTabId);
        openerTabByBrowserTab.delete(browserTabId);
        if (entry) {
            chrome.tabs.sendMessage(entry.openerTabId, { type: 'fileLinkPicked', url: msg.url, mode: entry.mode });
            chrome.tabs.update(entry.openerTabId, { active: true });
        }
        chrome.tabs.remove(browserTabId);
    }

    // Content script asks what mode it should operate in.
    if (msg && msg.type === 'getFileBrowserMode' && sender.tab) {
        const entry = openerTabByBrowserTab.get(sender.tab.id);
        sendResponse(entry ? entry.mode : null);
    }
});
