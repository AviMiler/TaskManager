
// Simple single-color (currentColor) SVG icons for project link buttons
const LINK_ICON_DEFS = {
    spec:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 2h6l5 5v13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"/><path d="M9 11h6"/><path d="M9 15h6"/><path d="M9 7h2"/></svg>',
    code:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m8 16-4-4 4-4"/><path d="m16 8 4 4-4 4"/><path d="m13 5-2 14"/></svg>',
    deploy: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09Z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 19 2c0 2.5-.5 6.5-4 9a22.35 22.35 0 0 1-3 2Z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>',
    excel:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>',
    link:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    folder: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h5l2 2h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/></svg>',
    design: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>',
    doc:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>'
};

const LINK_ICONS = Object.keys(LINK_ICON_DEFS);

function renderLinkIcon(iconId) {
    return LINK_ICON_DEFS[iconId] || LINK_ICON_DEFS.link;
}

const LINK_ICON_LABELS = {
    spec: 'איפיון',
    code: 'קוד',
    deploy: 'תוכנית עליה',
    excel: 'XL',
    link: 'קישור',
    folder: 'תיקייה',
    design: 'עיצוב',
    doc: 'מסמך'
};

function openLinkModal(projectId, linkId) {
    const project = getProjects().find(p => p.id === projectId);
    if (!project) return;
    const links = Array.isArray(project.links) ? project.links : [];
    const link = linkId ? links.find(l => l.id === linkId) : null;
    const isNew = !link;
    let linkType = 'http';
    if (link && link.url) {
        if (link.url.startsWith('[#VSC#]')) linkType = 'vsc';
        else if (link.url.startsWith('file:')) linkType = 'file';
    }
    const fileUrlValue = linkType === 'file' && link ? link.url : '';
    const vscPathValue = linkType === 'vsc' && link ? link.url.replace('[#VSC#]', '') : '';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'linkModal';
    overlay.innerHTML = `
        <div class="modal" data-action="event.stopPropagation()" style="max-width: 440px;">
            <div class="modal-header">
                <h2 class="modal-title">${isNew ? 'קישור חדש' : 'עריכת קישור'}</h2>
                <button class="modal-close" type="button" aria-label="סגור" data-action="closeLinkModal()">×</button>
            </div>
            <div class="modal-body">
                <div class="field">
                    <label class="field-label">שם *</label>
                    <input type="text" id="linkName" class="field-input" value="${link ? unescapeForInput(link.name) : ''}" placeholder="לדוגמה: מסמך עיצוב">
                </div>
                <div class="field">
                    <label class="field-label">סוג קישור</label>
                    <div class="link-type-selector">
                        <button type="button" class="link-type-btn${linkType === 'http' ? ' active' : ''}" data-type="http" id="linkTypeHttp">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                            HTTP
                        </button>
                        <button type="button" class="link-type-btn${linkType === 'file' ? ' active' : ''}" data-type="file" id="linkTypeFile">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                            File
                        </button>
                        <button type="button" class="link-type-btn${linkType === 'vsc' ? ' active' : ''}" data-type="vsc" id="linkTypeVsc">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m8 16-4-4 4-4"/><path d="m16 8 4 4-4 4"/><path d="m13 5-2 14"/></svg>
                            VSC
                        </button>
                    </div>
                </div>
                <div class="field">
                    <label class="field-label">קישור *</label>
                    <div id="linkInputContainer">
                        <input type="text" id="linkUrl" class="field-input" value="${link && linkType === 'http' ? link.url : ''}" placeholder="https://..." style="display: ${linkType === 'http' ? 'block' : 'none'}">
                        <div id="fileInputWrap" style="display: ${linkType === 'file' ? 'block' : 'none'}">
                            <div class="file-upload-row">
                                <button type="button" id="filePickerBtn" class="file-picker-btn">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                    העלאה
                                </button>
                                <button type="button" id="fileHelpBtn" class="file-help-btn" aria-label="עזרה" title="איך מעתיקים נתיב?">?</button>
                            </div>
                            <input type="file" id="linkFileInput" style="display:none;">
                            <input type="text" id="linkFileUrl" class="field-input" value="${fileUrlValue}" placeholder="הדבק כאן את הנתיב המלא" style="margin-top: 8px; direction: ltr; text-align: left;">
                        </div>
                        <div id="vscInputWrap" style="display: ${linkType === 'vsc' ? 'block' : 'none'}">
                            <div class="file-upload-row">
                                <button type="button" id="vscPickerBtn" class="file-picker-btn">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h5l2 2h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/></svg>
                                    בחר תיקייה
                                </button>
                                <button type="button" id="vscHelpBtn" class="file-help-btn" aria-label="עזרה" title="איך מעתיקים נתיב?">?</button>
                            </div>
                            <input type="file" id="linkVscInput" webkitdirectory directory multiple style="display:none;">
                            <input type="text" id="linkVscPath" class="field-input" value="${vscPathValue}" placeholder="הדבק כאן את הנתיב המלא לתיקייה" style="margin-top: 8px; direction: ltr; text-align: left;">
                        </div>
                    </div>
                </div>
                <div class="field">
                    <label class="field-label">אייקון</label>
                    <div class="link-icon-picker" id="linkIconPicker">
                        ${LINK_ICONS.map(ic => `<button type="button" class="link-icon-opt${(link && link.icon === ic) || (!link && ic === 'link') ? ' selected' : ''}" data-icon="${ic}" title="${LINK_ICON_LABELS[ic]}">${LINK_ICON_DEFS[ic]}</button>`).join('')}
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" type="button" data-action="closeLinkModal()">ביטול</button>
                <button class="btn-primary" type="button" id="saveLinkBtn">שמור</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // Link type selector
    const typeButtons = overlay.querySelectorAll('.link-type-btn');
    const urlInput = overlay.querySelector('#linkUrl');
    const fileInputWrap = overlay.querySelector('#fileInputWrap');
    const vscInputWrap = overlay.querySelector('#vscInputWrap');
    typeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            typeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            urlInput.style.display = type === 'http' ? 'block' : 'none';
            fileInputWrap.style.display = type === 'file' ? 'block' : 'none';
            vscInputWrap.style.display = type === 'vsc' ? 'block' : 'none';
        });
    });

    // Upload button - opens file picker, fills name into URL field
    const filePickerBtn = overlay.querySelector('#filePickerBtn');
    const fileInput = overlay.querySelector('#linkFileInput');
    const fileUrlInput = overlay.querySelector('#linkFileUrl');

    if (filePickerBtn && fileInput) {
        filePickerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            fileInput.click();
        });
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                fileUrlInput.value = 'file:///' + file.name;
                fileUrlInput.focus();
                fileUrlInput.select();
            }
        });
    }

    // Help button - shows instructions for full path
    const fileHelpBtn = overlay.querySelector('#fileHelpBtn');
    if (fileHelpBtn) {
        fileHelpBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showAlert('כדי לקבל נתיב מלא לקובץ:\n\n1. פתח את סייר הקבצים של Windows\n2. נווט לקובץ הרצוי\n3. לחץ Shift + לחיצה ימנית על הקובץ\n4. בחר "העתק כנתיב" (Copy as path)\n5. הדבק כאן (Ctrl+V) - המרכאות יוסרו אוטומטית');
        });
    }

    // Auto-strip quotes and clean path on input
    if (fileUrlInput) {
        fileUrlInput.addEventListener('input', () => {
            const cleaned = fileUrlInput.value.replace(/^["']+|["']+$/g, '').trim();
            if (cleaned !== fileUrlInput.value) {
                fileUrlInput.value = cleaned;
            }
        });
    }

    // VSC folder picker - opens directory picker, fills folder name into path field
    const vscPickerBtn = overlay.querySelector('#vscPickerBtn');
    const vscInput = overlay.querySelector('#linkVscInput');
    const vscPathInput = overlay.querySelector('#linkVscPath');

    if (vscPickerBtn && vscInput) {
        vscPickerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            vscInput.click();
        });
        vscInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && file.webkitRelativePath) {
                const folderName = file.webkitRelativePath.split('/')[0];
                vscPathInput.value = folderName;
                vscPathInput.focus();
                vscPathInput.select();
            }
        });
    }

    // VSC help button
    const vscHelpBtn = overlay.querySelector('#vscHelpBtn');
    if (vscHelpBtn) {
        vscHelpBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showAlert('כדי לקבל נתיב מלא לתיקייה:\n\n1. פתח את סייר הקבצים של Windows\n2. נווט לתיקייה הרצויה\n3. לחץ Shift + לחיצה ימנית על התיקייה\n4. בחר "העתק כנתיב" (Copy as path)\n5. הדבק כאן (Ctrl+V) - המרכאות יוסרו אוטומטית\n\nהקישור ייפתח בתיקייה ב-VS Code\n\n💡 כדי שהתיקייה תיפתח בחלון חדש (ולא תחליף את הקיים):\n1. פתח VS Code\n2. Ctrl+, (הגדרות)\n3. חפש: openFoldersInNewWindow\n4. שנה את הערך ל-"on"');
        });
    }

    // Auto-strip quotes and clean path on input
    if (vscPathInput) {
        vscPathInput.addEventListener('input', () => {
            const cleaned = vscPathInput.value.replace(/^["']+|["']+$/g, '').trim();
            if (cleaned !== vscPathInput.value) {
                vscPathInput.value = cleaned;
            }
        });
    }

    overlay.querySelectorAll('.link-icon-opt').forEach(b => {
        b.addEventListener('click', () => {
            overlay.querySelectorAll('.link-icon-opt').forEach(x => x.classList.remove('selected'));
            b.classList.add('selected');
        });
    });

    overlay.querySelector('#saveLinkBtn').addEventListener('click', () => saveLinkFromModal(projectId, linkId));
    setTimeout(() => overlay.querySelector('#linkName').focus(), 50);
}

function closeLinkModal() {
    const m = document.getElementById('linkModal');
    if (m) m.remove();
}

async function saveLinkFromModal(projectId, linkId) {
    const name = document.getElementById('linkName').value.trim();
    const urlInput = document.getElementById('linkUrl');
    const modal = document.getElementById('linkModal');
    const selected = document.querySelector('#linkIconPicker .link-icon-opt.selected');
    const icon = selected ? selected.dataset.icon : 'link';

    if (!name) { await showAlert('שם חובה'); return; }

    let url = '';
    const activeTypeBtn = document.querySelector('.link-type-btn.active');
    const linkType = activeTypeBtn ? activeTypeBtn.dataset.type : 'http';

    const projects = getProjects();
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    if (!Array.isArray(project.links)) project.links = [];
    const existingLink = linkId ? project.links.find(x => x.id === linkId) : null;

    if (linkType === 'http') {
        url = urlInput.value.trim();
        if (!url) { await showAlert('קישור חובה'); return; }
        if (!/^[a-zA-Z]+:\/\//.test(url) && !url.startsWith('/') && !url.startsWith('mailto:')) {
            url = 'https://' + url;
        }
    } else if (linkType === 'file') {
        const fileUrlInput = document.getElementById('linkFileUrl');
        url = fileUrlInput ? fileUrlInput.value.trim() : '';
        url = url.replace(/^["']+|["']+$/g, '').trim();
        if (!url) { await showAlert('הכנס נתיב קובץ'); return; }
        if (!url.startsWith('file:')) {
            url = 'file:///' + url.replace(/\\/g, '/').replace(/^\/+/, '');
        }
    } else if (linkType === 'vsc') {
        const vscPathInput = document.getElementById('linkVscPath');
        let path = vscPathInput ? vscPathInput.value.trim() : '';
        path = path.replace(/^["']+|["']+$/g, '').trim();
        if (!path) { await showAlert('הכנס נתיב תיקייה'); return; }
        url = '[#VSC#]' + path;
    }

    if (linkId) {
        const l = project.links.find(x => x.id === linkId);
        if (l) { l.name = escapeHtml(name); l.url = url; l.icon = icon; }
    } else {
        project.links.push({ id: 'link_' + newId(), name: escapeHtml(name), url, icon });
    }

    // Bump the timestamp so file-sync's merge-by-updatedAt keeps this edit
    // instead of letting an older remote copy overwrite it on the next pull.
    project.updatedAt = new Date().toISOString();

    saveProjects(projects);
    closeLinkModal();
    renderProjectDetails();
}

function deleteLink(projectId, linkId) {
    const projects = getProjects();
    const project = projects.find(p => p.id === projectId);
    if (!project || !Array.isArray(project.links)) return;
    project.links = project.links.filter(l => l.id !== linkId);
    project.updatedAt = new Date().toISOString();
    saveProjects(projects);
    renderProjectDetails();
}

function toggleProjectDropdown() {
    const dropdown = document.getElementById('projectDropdown');
    const btn = document.getElementById('projectSelectorBtn');
    if (!dropdown) return;
    const isOpen = dropdown.classList.contains('open');
    if (isOpen) {
        closeProjectDropdown();
    } else {
        dropdown.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
        setTimeout(() => {
            const input = document.getElementById('newProjectInput');
            if (input) input.focus();
        }, 50);
    }
}

function closeProjectDropdown() {
    const dropdown = document.getElementById('projectDropdown');
    const btn = document.getElementById('projectSelectorBtn');
    if (dropdown) dropdown.classList.remove('open');
    if (btn) btn.setAttribute('aria-expanded', 'false');
}
