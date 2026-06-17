// Content script injected into Chrome's built-in file:// pages (directory
// listings or file views). Adds checkboxes next to file/folder entries so
// the user can pick one, then confirm with a floating button.
// The mode ('file' or 'folder') is received from the background service
// worker and controls which entries get checkboxes.

(function () {
    let selectedUrl = null;
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

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.title = browseMode === 'folder' ? 'סמן תיקייה זו לבחירה' : 'סמן קובץ זה לבחירה';
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
                document.querySelectorAll('input[data-tb-checkbox="1"]').forEach((cb) => {
                    if (cb !== checkbox) cb.checked = false;
                });
                selectedUrl = href;
            } else if (selectedUrl === href) {
                selectedUrl = null;
            }
        });
        checkbox.dataset.tbCheckbox = '1';

        anchor.insertAdjacentElement('afterend', checkbox);
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
        `;
        document.documentElement.appendChild(style);

        const pageBtn = document.createElement('button');
        const label = browseMode === 'folder' ? '✓ אישור בחירת תיקייה ל-TaskBoard' : '✓ אישור בחירת קובץ ל-TaskBoard';
        pageBtn.textContent = label;
        pageBtn.style.position = 'fixed';
        pageBtn.style.bottom = '12px';
        pageBtn.style.left = '12px';
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

        scanEntries();
        new MutationObserver(scanEntries).observe(document.documentElement, { childList: true, subtree: true });
    });
})();
