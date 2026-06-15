// Content script injected into Chrome's built-in file:// pages (directory
// listings or file views). Adds:
//  - a small "✓" button next to every file/folder entry in the listing, so
//    the user can pick a specific item without navigating into it;
//  - a floating button to pick the current page's own URL (the open file,
//    or the directory itself).
// Either sends the chosen file:// URL back to TaskBoard via the background
// service worker, which relays it to the link modal's path field.

(function () {
    let selectedUrl = null;

    function sendUrl(url) {
        chrome.runtime.sendMessage({ type: 'fileLinkSelected', url });
    }

    function addEntryPickButton(anchor) {
        if (anchor.dataset.tbPicked) return;
        anchor.dataset.tbPicked = '1';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.title = 'סמן פריט זה לבחירה';
        checkbox.style.marginInlineStart = '6px';
        checkbox.style.cursor = 'pointer';
        checkbox.style.width = '16px';
        checkbox.style.height = '16px';
        checkbox.style.verticalAlign = 'middle';

        checkbox.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                // Only one item may be selected at a time.
                document.querySelectorAll('input[data-tb-checkbox="1"]').forEach((cb) => {
                    if (cb !== checkbox) cb.checked = false;
                });
                selectedUrl = anchor.href;
            } else if (selectedUrl === anchor.href) {
                selectedUrl = null;
            }
        });
        checkbox.dataset.tbCheckbox = '1';

        anchor.insertAdjacentElement('afterend', checkbox);
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
    pageBtn.textContent = '✓ אישור בחירה ל-TaskBoard';
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

    pageBtn.addEventListener('click', () => sendUrl(selectedUrl || location.href));

    document.documentElement.appendChild(pageBtn);
})();
