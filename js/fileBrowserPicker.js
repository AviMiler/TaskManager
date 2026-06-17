// Content script injected into Chrome's built-in file:// pages.
// Adds a "select" button next to each file/folder entry.
// Re-injects buttons on every DOM change so other extensions can't kill them.

(function () {
    let browseMode = 'file';

    function sendUrl(url) {
        chrome.runtime.sendMessage({ type: 'fileLinkSelected', url });
    }

    function isFolder(href) {
        return href.endsWith('/');
    }

    function injectButtons() {
        document.querySelectorAll('.tb-pick-btn').forEach(b => b.remove());

        document.querySelectorAll('a[href]').forEach((a) => {
            if (!a.href || !a.href.startsWith('file://') || a.href === location.href) return;

            const href = a.href;
            const entryIsFolder = isFolder(href);

            if ((browseMode === 'file' && entryIsFolder) || (browseMode === 'folder' && !entryIsFolder)) {
                return;
            }

            const btn = document.createElement('button');
            btn.textContent = browseMode === 'folder' ? 'בחר תיקייה' : 'בחר קובץ';
            btn.className = 'tb-pick-btn';
            btn.style.cssText = 'margin-inline-start:8px;padding:2px 10px;font-size:13px;font-family:system-ui,sans-serif;background:#2563eb !important;color:#fff !important;border:none !important;border-radius:4px;cursor:pointer;vertical-align:middle;display:inline-block !important;visibility:visible !important;opacity:1 !important;position:relative !important;';
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                sendUrl(href);
            });

            a.insertAdjacentElement('afterend', btn);
        });
    }

    chrome.runtime.sendMessage({ type: 'getFileBrowserMode' }, (mode) => {
        if (chrome.runtime.lastError || !mode) return;
        browseMode = mode;

        injectButtons();

        let timeout;
        new MutationObserver(() => {
            clearTimeout(timeout);
            timeout = setTimeout(injectButtons, 100);
        }).observe(document.documentElement, { childList: true, subtree: true });
    });
})();
