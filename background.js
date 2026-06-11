// Service worker for the TaskBoard extension.
// The app is a full-page board, so a tiny toolbar popup would be cramped.
// Clicking the toolbar icon opens the app in its own tab. This needs no
// extra permissions (opening an extension page by URL is always allowed).

chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
});
