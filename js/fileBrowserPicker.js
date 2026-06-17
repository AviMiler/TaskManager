// Content script injected into Chrome's built-in file:// pages (directory
// listings or file views). Adds a "select" button next to each matching
// entry (file or folder, depending on mode). Clicking the button immediately
// sends the chosen URL back to TaskBoard — no extra confirm step needed.
// The mode ('file' or 'folder') is received from the background service
// worker and controls which entries get a button.

(function () {
    let browseMode = 'file';

    function sendUrl(url) {
        chrome.runtime.sendMessage({ type: 'fileLinkSelected', url });
    }

    function isFolder(href) {
        return href.endsWith('/');
    }

    function addEntryPickButton(anchor) {
        if (anchor.dataset.tbPicked) return;
        anchor.dataset.tbPicked = '1';

        const href = anchor.href;
        const entryIsFolder = isFolder(href);

        if ((browseMode === 'file' && entryIsFolder) || (browseMode === 'folder' && !entryIsFolder)) {
            return;
        }

        const btn = document.createElement('button');
        btn.textContent = browseMode === 'folder' ? 'בחר תיקייה' : 'בחר קובץ';
        btn.className = 'tb-pick-btn';
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            sendUrl(href);
        });

        anchor.insertAdjacentElement('afterend', btn);
    }

    function scanEntries() {
        document.querySelectorAll('a[href]').forEach((a) => {
            if (a.href && a.href.startsWith('file://') && a.href !== location.href) {
                addEntryPickButton(a);
            }
        });
    }

    chrome.runtime.sendMessage({ type: 'getFileBrowserMode' }, (mode) => {
        if (chrome.runtime.lastError || !mode) return;
        browseMode = mode;

        const style = document.createElement('style');
        style.textContent = `
            body { font-family: system-ui, sans-serif !important; font-size: 16px !important; }
            table#dir-content tr, table#dir-content td { font-size: 16px !important; line-height: 2.2 !important; }
            table#dir-content td { padding-top: 6px !important; padding-bottom: 6px !important; }
            a[href^="file://"] { font-size: 16px !important; }
            .tb-pick-btn {
                margin-inline-start: 8px;
                padding: 2px 10px;
                font-size: 13px;
                font-family: system-ui, sans-serif;
                background: #2563eb;
                color: #fff;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                vertical-align: middle;
            }
            .tb-pick-btn:hover { background: #1d4ed8; }
        `;
        document.documentElement.appendChild(style);

        scanEntries();
        new MutationObserver(scanEntries).observe(document.documentElement, { childList: true, subtree: true });
    });
})();
