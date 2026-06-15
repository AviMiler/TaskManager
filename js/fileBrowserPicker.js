// Content script injected into Chrome's built-in file:// pages (directory
// listings or file views). Adds a floating button that sends the current
// file:// URL back to TaskBoard via the background service worker, so the
// "פתח דפדפן קבצים" flow can pick a real on-disk path.

(function () {
    const btn = document.createElement('button');
    btn.textContent = '✓ בחר נתיב זה ל-TaskBoard';
    btn.style.position = 'fixed';
    btn.style.top = '12px';
    btn.style.right = '12px';
    btn.style.zIndex = '2147483647';
    btn.style.padding = '10px 16px';
    btn.style.fontSize = '14px';
    btn.style.fontFamily = 'system-ui, sans-serif';
    btn.style.background = '#2563eb';
    btn.style.color = '#fff';
    btn.style.border = 'none';
    btn.style.borderRadius = '6px';
    btn.style.cursor = 'pointer';
    btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';

    btn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'fileLinkSelected', url: location.href });
    });

    document.documentElement.appendChild(btn);
})();
