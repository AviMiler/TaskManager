// Content script injected into file:// pages.
// Supports two layouts:
// 1. Chrome's default directory listing (<a href> rows)
// 2. "chrome-file-explorer" extension (.we-grid-item with folder icon SVG)
// Adds a pick button to each file/folder entry (based on mode).

(function () {
    let browseMode = 'file';

    function sendUrl(url) {
        chrome.runtime.sendMessage({ type: 'fileLinkSelected', url });
    }

    function isFolder(href) {
        return href.endsWith('/');
    }

    function currentDirUrl() {
        let url = location.href;
        if (!url.endsWith('/')) url += '/';
        return url;
    }

    function isFolderIcon(item) {
        const svg = item.querySelector('svg');
        if (!svg) return false;
        return !!svg.querySelector('rect[fill="#FFC829"]');
    }

    // ── Chrome default file:// page ──

    function injectDefaultButtons() {
        document.querySelectorAll('.tb-pick-btn').forEach(b => b.remove());

        document.querySelectorAll('a[href]').forEach((a) => {
            if (!a.href || !a.href.startsWith('file://') || a.href === location.href) return;

            const href = a.href;
            const entryIsFolder = isFolder(href);
            if ((browseMode === 'file' && entryIsFolder) || (browseMode === 'folder' && !entryIsFolder)) return;

            const btn = document.createElement('button');
            btn.textContent = entryIsFolder ? 'בחר תיקייה' : 'בחר קובץ';
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

    // ── chrome-file-explorer extension ──

    function injectExplorerButtons() {
        document.querySelectorAll('.tb-pick-btn').forEach(b => b.remove());

        const base = currentDirUrl();

        document.querySelectorAll('.we-grid-item').forEach((item) => {
            const label = item.querySelector('.we-grid-item-label');
            if (!label) return;

            const name = label.textContent.trim();
            if (!name) return;

            const entryIsFolder = isFolderIcon(item);
            if ((browseMode === 'file' && entryIsFolder) || (browseMode === 'folder' && !entryIsFolder)) return;

            const url = base + encodeURIComponent(name) + (entryIsFolder ? '/' : '');

            const btn = document.createElement('button');
            btn.textContent = entryIsFolder ? 'בחר תיקייה' : 'בחר קובץ';
            btn.className = 'tb-pick-btn';
            Object.assign(btn.style, {
                position: 'absolute', bottom: '-2px', left: '50%', transform: 'translateX(-50%)',
                padding: '2px 8px', fontSize: '11px', fontFamily: 'system-ui,sans-serif',
                background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px',
                cursor: 'pointer', whiteSpace: 'nowrap', zIndex: '999999',
                boxShadow: '0 1px 4px rgba(0,0,0,0.3)'
            });
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                sendUrl(url);
            });

            item.style.position = 'relative';
            item.style.paddingBottom = '20px';
            item.appendChild(btn);
        });

        document.querySelectorAll('.we-details-row').forEach((row) => {
            const nameCell = row.querySelector('.we-details-name');
            if (!nameCell) return;

            const name = nameCell.textContent.trim();
            if (!name) return;

            const entryIsFolder = !!row.querySelector('svg rect[fill="#FFC829"]');
            if ((browseMode === 'file' && entryIsFolder) || (browseMode === 'folder' && !entryIsFolder)) return;

            const url = base + encodeURIComponent(name) + (entryIsFolder ? '/' : '');

            const btn = document.createElement('button');
            btn.textContent = entryIsFolder ? 'בחר תיקייה' : 'בחר קובץ';
            btn.className = 'tb-pick-btn';
            btn.style.cssText = 'margin-inline-start:8px;padding:2px 10px;font-size:12px;font-family:system-ui,sans-serif;background:#2563eb;color:#fff;border:none;border-radius:4px;cursor:pointer;vertical-align:middle;';
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                sendUrl(url);
            });
            nameCell.appendChild(btn);
        });
    }

    // ── Bootstrap ──

    function isExplorerActive() {
        return !!document.querySelector('.we-root');
    }

    function inject() {
        if (isExplorerActive()) {
            injectExplorerButtons();
        } else {
            injectDefaultButtons();
        }
    }

    chrome.runtime.sendMessage({ type: 'getFileBrowserMode' }, (mode) => {
        if (chrome.runtime.lastError || !mode) return;
        browseMode = mode;

        inject();

        let timeout;
        new MutationObserver(() => {
            clearTimeout(timeout);
            timeout = setTimeout(inject, 200);
        }).observe(document.documentElement, { childList: true, subtree: true });
    });
})();
