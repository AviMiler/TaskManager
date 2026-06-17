// Content script injected into Chrome's built-in file:// pages.
// Renders a floating panel (inside Shadow DOM so no extension can touch it)
// listing all file/folder entries on the page as selectable buttons.

(function () {
    let browseMode = 'file';

    function sendUrl(url) {
        chrome.runtime.sendMessage({ type: 'fileLinkSelected', url });
    }

    function isFolder(href) {
        return href.endsWith('/');
    }

    function getEntryName(href) {
        const decoded = decodeURIComponent(href.replace(/\/+$/, ''));
        return decoded.split('/').pop() || decoded;
    }

    function buildPanel(shadow) {
        const list = shadow.querySelector('.tb-list');
        list.innerHTML = '';

        const anchors = document.querySelectorAll('a[href]');
        let count = 0;

        anchors.forEach((a) => {
            if (!a.href || !a.href.startsWith('file://') || a.href === location.href) return;

            const href = a.href;
            const entryIsFolder = isFolder(href);

            if ((browseMode === 'file' && entryIsFolder) || (browseMode === 'folder' && !entryIsFolder)) {
                return;
            }

            count++;
            const row = document.createElement('button');
            row.className = 'tb-row';
            row.textContent = (entryIsFolder ? '📁 ' : '📄 ') + getEntryName(href);
            row.title = href;
            row.addEventListener('click', () => sendUrl(href));
            list.appendChild(row);
        });

        const empty = shadow.querySelector('.tb-empty');
        if (empty) empty.style.display = count ? 'none' : 'block';
    }

    chrome.runtime.sendMessage({ type: 'getFileBrowserMode' }, (mode) => {
        if (chrome.runtime.lastError || !mode) return;
        browseMode = mode;

        const host = document.createElement('div');
        host.id = 'tb-picker-host';
        host.style.cssText = 'position:fixed;top:0;left:0;z-index:2147483647;pointer-events:none;width:0;height:0;';
        document.documentElement.appendChild(host);

        const shadow = host.attachShadow({ mode: 'closed' });

        const title = browseMode === 'folder' ? 'בחר תיקייה — TaskBoard' : 'בחר קובץ — TaskBoard';
        const emptyText = browseMode === 'folder' ? 'אין תיקיות בדף זה' : 'אין קבצים בדף זה';

        shadow.innerHTML = `
            <style>
                .tb-panel {
                    pointer-events: auto;
                    position: fixed;
                    bottom: 16px;
                    left: 16px;
                    width: 340px;
                    max-height: 60vh;
                    background: #fff;
                    border-radius: 10px;
                    box-shadow: 0 4px 24px rgba(0,0,0,0.25);
                    font-family: system-ui, -apple-system, sans-serif;
                    font-size: 14px;
                    direction: rtl;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                .tb-header {
                    padding: 12px 16px;
                    font-weight: 600;
                    font-size: 15px;
                    background: #2563eb;
                    color: #fff;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .tb-close {
                    background: none;
                    border: none;
                    color: #fff;
                    font-size: 18px;
                    cursor: pointer;
                    padding: 0 4px;
                    line-height: 1;
                }
                .tb-close:hover { opacity: 0.7; }
                .tb-list {
                    overflow-y: auto;
                    padding: 8px;
                    flex: 1;
                }
                .tb-row {
                    display: block;
                    width: 100%;
                    text-align: right;
                    padding: 8px 12px;
                    margin-bottom: 4px;
                    background: #f1f5f9;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    font-family: inherit;
                    color: #1e293b;
                    transition: background 0.15s;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .tb-row:hover {
                    background: #dbeafe;
                    border-color: #93c5fd;
                }
                .tb-row:active {
                    background: #2563eb;
                    color: #fff;
                }
                .tb-empty {
                    padding: 16px;
                    text-align: center;
                    color: #94a3b8;
                }
                .tb-panel.tb-collapsed .tb-list,
                .tb-panel.tb-collapsed .tb-empty {
                    display: none !important;
                }
            </style>
            <div class="tb-panel">
                <div class="tb-header">
                    <span>${title}</span>
                    <button class="tb-close" title="מזער">−</button>
                </div>
                <div class="tb-list"></div>
                <div class="tb-empty">${emptyText}</div>
            </div>
        `;

        const panel = shadow.querySelector('.tb-panel');
        shadow.querySelector('.tb-close').addEventListener('click', () => {
            panel.classList.toggle('tb-collapsed');
        });

        buildPanel(shadow);
        new MutationObserver(() => buildPanel(shadow)).observe(document.documentElement, { childList: true, subtree: true });
    });
})();
