// Content script injected into Chrome's built-in file:// pages (directory
// listings or file views). Adds:
//  - a small "✓" button next to every file/folder entry in the listing, so
//    the user can pick a specific item without navigating into it;
//  - a floating button to pick the current page's own URL (the open file,
//    or the directory itself).
// Either sends the chosen file:// URL back to TaskBoard via the background
// service worker, which relays it to the link modal's path field.

(function () {
    function sendUrl(url) {
        chrome.runtime.sendMessage({ type: 'fileLinkSelected', url });
    }

    function addEntryPickButton(anchor) {
        if (anchor.dataset.tbPicked) return;
        anchor.dataset.tbPicked = '1';

        const btn = document.createElement('button');
        btn.textContent = '✓';
        btn.title = 'בחר פריט זה ל-TaskBoard';
        btn.style.marginInlineStart = '6px';
        btn.style.padding = '0 6px';
        btn.style.fontSize = '13px';
        btn.style.lineHeight = '1.6';
        btn.style.background = '#16a34a';
        btn.style.color = '#fff';
        btn.style.border = 'none';
        btn.style.borderRadius = '4px';
        btn.style.cursor = 'pointer';

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            sendUrl(anchor.href);
        });

        anchor.insertAdjacentElement('afterend', btn);
    }

    function scanEntries() {
        // Chrome's directory-listing rows are <a href="file://..."> links to
        // each file/subfolder. Skip the page's own URL (would just re-add a
        // button to itself via "..": filtered by href !== location.href).
        document.querySelectorAll('a[href^="file://"]').forEach((a) => {
            if (a.href !== location.href) addEntryPickButton(a);
        });
    }

    scanEntries();
    // Chrome builds the directory listing asynchronously after the initial
    // document load, so observe for the rows being added.
    new MutationObserver(scanEntries).observe(document.documentElement, { childList: true, subtree: true });

    // Floating button: pick the current page itself (the open file, or the
    // directory being viewed - e.g. for a VSC folder link).
    const pageBtn = document.createElement('button');
    pageBtn.textContent = '✓ בחר את העמוד הזה ל-TaskBoard';
    pageBtn.style.position = 'fixed';
    pageBtn.style.top = '12px';
    pageBtn.style.right = '12px';
    pageBtn.style.zIndex = '2147483647';
    pageBtn.style.padding = '10px 16px';
    pageBtn.style.fontSize = '14px';
    pageBtn.style.fontFamily = 'system-ui, sans-serif';
    pageBtn.style.background = '#2563eb';
    pageBtn.style.color = '#fff';
    pageBtn.style.border = 'none';
    pageBtn.style.borderRadius = '6px';
    pageBtn.style.cursor = 'pointer';
    pageBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';

    pageBtn.addEventListener('click', () => sendUrl(location.href));

    document.documentElement.appendChild(pageBtn);
})();
