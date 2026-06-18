// Content script injected into file:// pages.
// Supports two layouts:
// 1. Chrome's default directory listing (<a href> rows)
// 2. "chrome-file-explorer" extension (.we-grid-item with folder icon SVG)
// Adds a pick button to each file/folder entry (based on mode).
//
// Injection is idempotent: a button is only added where one is missing,
// and existing buttons are never removed — this avoids the flicker caused
// by the Explorer re-rendering on every click.

(function () {
    let browseMode = 'file';
    let observing = false;
    let observer = null;

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

    function isFolderIcon(el) {
        return !!el.querySelector('svg rect[fill="#FFC829"]');
    }

    function wantThisType(entryIsFolder) {
        if (browseMode === 'file' && entryIsFolder) return false;
        if (browseMode === 'folder' && !entryIsFolder) return false;
        return true;
    }

    function makeBtn(entryIsFolder, url, extraCss) {
        const btn = document.createElement('button');
        btn.textContent = entryIsFolder ? 'בחר תיקייה' : 'בחר קובץ';
        btn.className = 'tb-pick-btn';
        btn.style.cssText = extraCss;
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            sendUrl(url);
        });
        return btn;
    }

    // ── Chrome default file:// page ──

    function injectDefaultButtons() {
        document.querySelectorAll('a[href]').forEach((a) => {
            if (!a.href || !a.href.startsWith('file://') || a.href === location.href) return;
            if (a.nextElementSibling && a.nextElementSibling.classList.contains('tb-pick-btn')) return;

            const href = a.href;
            const entryIsFolder = isFolder(href);
            if (!wantThisType(entryIsFolder)) return;

            const btn = makeBtn(entryIsFolder, href,
                'margin-inline-start:8px;padding:2px 10px;font-size:13px;font-family:system-ui,sans-serif;background:#2563eb !important;color:#fff !important;border:none !important;border-radius:4px;cursor:pointer;vertical-align:middle;display:inline-block !important;visibility:visible !important;opacity:1 !important;position:relative !important;');
            a.insertAdjacentElement('afterend', btn);
        });
    }

    // ── chrome-file-explorer extension ──

    function injectExplorerButtons() {
        const base = currentDirUrl();

        document.querySelectorAll('.we-grid-item').forEach((item) => {
            if (item.querySelector(':scope > .tb-pick-btn')) return;

            const label = item.querySelector('.we-grid-item-label');
            if (!label) return;
            const name = label.textContent.trim();
            if (!name) return;

            const entryIsFolder = isFolderIcon(item);
            if (!wantThisType(entryIsFolder)) return;

            const url = base + encodeURIComponent(name) + (entryIsFolder ? '/' : '');
            const btn = makeBtn(entryIsFolder, url,
                'position:absolute;bottom:-2px;left:50%;transform:translateX(-50%);padding:2px 8px;font-size:11px;font-family:system-ui,sans-serif;background:#2563eb;color:#fff;border:none;border-radius:4px;cursor:pointer;white-space:nowrap;z-index:999999;box-shadow:0 1px 4px rgba(0,0,0,0.3);');

            item.style.position = 'relative';
            item.style.paddingBottom = '20px';
            item.appendChild(btn);
        });

        document.querySelectorAll('.we-details-row').forEach((row) => {
            const nameCell = row.querySelector('.we-details-name');
            if (!nameCell) return;
            if (nameCell.querySelector('.tb-pick-btn')) return;

            const name = nameCell.textContent.trim();
            if (!name) return;

            const entryIsFolder = isFolderIcon(row);
            if (!wantThisType(entryIsFolder)) return;

            const url = base + encodeURIComponent(name) + (entryIsFolder ? '/' : '');
            const btn = makeBtn(entryIsFolder, url,
                'margin-inline-start:8px;padding:2px 10px;font-size:12px;font-family:system-ui,sans-serif;background:#2563eb;color:#fff;border:none;border-radius:4px;cursor:pointer;vertical-align:middle;');
            nameCell.appendChild(btn);
        });
    }

    // ── Bootstrap ──

    function isExplorerActive() {
        return !!document.querySelector('.we-root');
    }

    function inject() {
        // Pause the observer while we mutate, so our own button insertions
        // don't retrigger inject() (and cause flicker).
        if (observer && observing) {
            observer.disconnect();
            observing = false;
        }

        if (isExplorerActive()) {
            injectExplorerButtons();
        } else {
            injectDefaultButtons();
        }

        if (observer && !observing) {
            observer.observe(document.documentElement, { childList: true, subtree: true });
            observing = true;
        }
    }

    chrome.runtime.sendMessage({ type: 'getFileBrowserMode' }, (mode) => {
        if (chrome.runtime.lastError || !mode) return;
        browseMode = mode;

        let timeout;
        observer = new MutationObserver(() => {
            clearTimeout(timeout);
            timeout = setTimeout(inject, 150);
        });

        inject();
    });
})();
