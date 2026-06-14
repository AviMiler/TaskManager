
// ===== Daily Standup =====
function getDailies() {
    const d = localStorage.getItem(DB.dailies);
    return d ? JSON.parse(d) : [];
}

function saveDailies(list) {
    localStorage.setItem(DB.dailies, JSON.stringify(list));
    createBackup();
}

function todayKey() {
    return new Date().toISOString().slice(0, 10);
}

function getOrCreateTodayDaily() {
    const dailies = getDailies();
    const key = todayKey();
    let daily = dailies.find(d => d.id === key);
    if (!daily) {
        daily = { id: key, date: key, entries: [] };
        dailies.push(daily);
        saveDailies(dailies);
    }
    return daily;
}

function upsertMyEntry(dailyId, fields) {
    const dailies = getDailies();
    const daily = dailies.find(d => d.id === dailyId);
    if (!daily) return;
    const user = getUser();
    const now = new Date().toISOString();
    let entry = daily.entries.find(e => e.userName === user.name);
    if (entry) {
        Object.assign(entry, fields, { userHue: user.hue, updatedAt: now });
    } else {
        daily.entries.push({
            id: newId(),
            userName: user.name,
            userHue: user.hue,
            yesterday: '',
            today: '',
            blocked: '',
            createdAt: now,
            updatedAt: now,
            ...fields
        });
    }
    saveDailies(dailies);
}


// ===== Daily Standup Modal =====
function getInitials(name) {
    return (name || '').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
}

function formatHebrewDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

const DAILY_FIELD_LABELS = {
    yesterday: 'מה עשיתי אתמול',
    today: 'מה אני עושה היום',
    blocked: 'איפה אני תקוע'
};

function dailyRowHtml(entry, { editable = false, isMe = false } = {}) {
    const fields = ['yesterday', 'today', 'blocked'];
    const cells = fields.map(f => editable
        ? `<div class="daily-col" data-label="${DAILY_FIELD_LABELS[f]}"><textarea class="daily-edit" data-field="${f}" rows="2" placeholder="הקלד כאן…">${escapeHtml(entry[f] || '')}</textarea></div>`
        : `<div class="daily-col" data-label="${DAILY_FIELD_LABELS[f]}">${entry[f] ? escapeHtml(entry[f]).replace(/\n/g, '<br>') : '<span class="daily-empty-cell">—</span>'}</div>`
    ).join('');
    const actions = !isMe ? '' : editable
        ? `<div class="daily-row-actions">
               <button class="btn-secondary daily-cancel-btn" type="button">ביטול</button>
               <button class="btn-primary daily-save-btn" type="button">שמור</button>
           </div>`
        : `<div class="daily-row-actions">
               <button class="btn-secondary daily-edit-btn" type="button">${ICONS.pencil} ערוך</button>
           </div>`;
    return `
        <div class="daily-table-row${isMe ? ' daily-table-row-me' : ''}">
            <div class="daily-col-user">
                <span class="avatar" style="--hue:${entry.userHue ?? 200}">${getInitials(entry.userName)}</span>
                <span class="daily-username">${escapeHtml(entry.userName)}${isMe ? ' (אני)' : ''}</span>
            </div>
            ${cells}
            ${actions}
        </div>
    `;
}

function renderDailyTable(daily, forMe) {
    const user = getUser();
    let rows = '';
    if (forMe) {
        const myEntry = daily.entries.find(e => e.userName === user.name) ||
            { userName: user.name, userHue: user.hue, yesterday: '', today: '', blocked: '' };
        const hasContent = !!(myEntry.yesterday || myEntry.today || myEntry.blocked);
        rows += dailyRowHtml(myEntry, { editable: !hasContent, isMe: true });
        daily.entries.filter(e => e.userName !== user.name).forEach(e => rows += dailyRowHtml(e));
    } else {
        daily.entries.forEach(e => rows += dailyRowHtml(e));
    }
    if (!daily.entries.length && !forMe) rows = `<div class="daily-empty">אין דיווחים ביום זה</div>`;
    return `
        <div class="daily-table">
            <div class="daily-table-row daily-table-head">
                <div class="daily-col-user">משתתף/ת</div>
                <div class="daily-col">מה עשיתי אתמול</div>
                <div class="daily-col">מה אני עושה היום</div>
                <div class="daily-col">איפה אני תקוע</div>
            </div>
            ${rows}
        </div>
    `;
}

function openDailyModal() {
    if (document.getElementById('dailyModal')) return;
    const today = getOrCreateTodayDaily();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'dailyModal';
    overlay.innerHTML = `
        <div class="modal daily-modal" data-action="event.stopPropagation()">
            <div class="modal-header">
                <h2 class="modal-title">דיילי - ${formatHebrewDate(today.id)}</h2>
                <button class="modal-close" type="button" aria-label="סגור" data-action="closeDailyModal()">×</button>
            </div>
            <div class="modal-body">
                ${renderDailyTable(today, true)}
                <div class="daily-history-section">
                    <h3 class="daily-history-title">דיילים קודמים</h3>
                    <div class="daily-history" id="dailyHistory"></div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeDailyModal(); });

    bindDailyRowActions(overlay.querySelector('.daily-table'), today.id);
    renderDailyHistory();
}

// Wire up the edit/save/cancel buttons on "my" row. Re-bound every time
// the row is re-rendered (it's a small handful of listeners).
function bindDailyRowActions(table, dailyId) {
    if (!table) return;

    const editBtn = table.querySelector('.daily-table-row-me .daily-edit-btn');
    if (editBtn) {
        editBtn.addEventListener('click', () => renderMyDailyRow(table, dailyId, true));
    }

    const cancelBtn = table.querySelector('.daily-table-row-me .daily-cancel-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => renderMyDailyRow(table, dailyId, false));
    }

    const saveBtn = table.querySelector('.daily-table-row-me .daily-save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const row = table.querySelector('.daily-table-row-me');
            const fields = {};
            row.querySelectorAll('.daily-edit').forEach(el => { fields[el.dataset.field] = el.value; });
            upsertMyEntry(dailyId, fields);
            renderMyDailyRow(table, dailyId, false);
            renderDailyHistory();
        });
    }
}

// Replace "my" row with its editable or read-only rendering and re-bind actions.
function renderMyDailyRow(table, dailyId, editable) {
    const user = getUser();
    const daily = getDailies().find(d => d.id === dailyId) || { entries: [] };
    const myEntry = daily.entries.find(e => e.userName === user.name) ||
        { userName: user.name, userHue: user.hue, yesterday: '', today: '', blocked: '' };
    const row = table.querySelector('.daily-table-row-me');
    if (row) row.outerHTML = dailyRowHtml(myEntry, { editable, isMe: true });
    bindDailyRowActions(table, dailyId);
}

function renderDailyHistory() {
    const container = document.getElementById('dailyHistory');
    if (!container) return;
    const todayId = todayKey();
    const previous = getDailies()
        .filter(d => d.id !== todayId && d.entries.length > 0)
        .sort((a, b) => b.id.localeCompare(a.id));

    if (!previous.length) {
        container.innerHTML = `<div class="daily-empty">אין דיילים קודמים עדיין</div>`;
        return;
    }

    container.innerHTML = previous.map(d => `
        <div class="daily-history-item">
            <button class="daily-history-toggle" type="button" data-daily-id="${d.id}">
                <svg class="daily-history-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
                <span class="daily-history-date">${formatHebrewDate(d.id)}</span>
                <span class="daily-history-count">${d.entries.length} דיווחים</span>
            </button>
            <div class="daily-history-content" id="dailyHist_${d.id}">
                ${renderDailyTable(d, false)}
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.daily-history-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('open');
            const content = document.getElementById('dailyHist_' + btn.dataset.dailyId);
            if (content) content.classList.toggle('open');
        });
    });
}

function closeDailyModal() {
    const m = document.getElementById('dailyModal');
    if (m) m.remove();
}

// Re-render the open daily modal in place after a sync pulls in changes
// from other team members. Leaves the user's own (editable) row untouched
// so an in-progress, not-yet-blurred edit isn't clobbered.
function refreshDailyModalIfOpen() {
    const overlay = document.getElementById('dailyModal');
    if (!overlay) return;
    const today = getOrCreateTodayDaily();
    const user = getUser();

    const table = overlay.querySelector('.daily-table');
    if (table) {
        const others = today.entries.filter(e => e.userName !== user.name);
        table.querySelectorAll('.daily-table-row:not(.daily-table-row-head):not(.daily-table-row-me)').forEach(r => r.remove());
        table.insertAdjacentHTML('beforeend', others.map(e => dailyRowHtml(e, false)).join(''));
    }
    renderDailyHistory();
}
