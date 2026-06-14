function getUser() {
    const d = localStorage.getItem(DB.user);
    if (!d) return { ...DEFAULT_USER, id: getClientId() };
    try {
        const u = JSON.parse(d);
        return {
            id: getClientId(),
            name: u.name || DEFAULT_USER.name,
            role: u.role || DEFAULT_USER.role,
            hue: (u.hue !== undefined && u.hue !== null) ? u.hue : DEFAULT_USER.hue
        };
    } catch (e) {
        return { ...DEFAULT_USER, id: getClientId() };
    }
}

function saveUser(user) {
    localStorage.setItem(DB.user, JSON.stringify(user));
    const u = getUser();
    // Keep the team roster in sync with the profile and propagate the name to
    // every task that references this person.
    upsertMember({ id: u.id, name: u.name, role: u.role, hue: u.hue });
    propagateMemberName(u.id);
    createBackup();
    renderUserUI();
    rerenderCurrentView();
}

// Ownership check for the "show only mine" filters. A project is "mine" when
// its `memberIds` list includes the current user. Legacy projects without a
// member list fall back to `ownerId`/creator. A task is "mine" when its
// stable owner id matches the current browser, or (when includeAssignee is
// set) when it is assigned to me. Legacy items with no owner id are treated
// as shared so they never disappear from the board.
function isMine(item, { includeAssignee = false } = {}) {
    if (!item) return false;
    const me = getUser();
    if (Array.isArray(item.memberIds)) {
        return item.memberIds.map(String).includes(String(me.id));
    }
    if (item.ownerId !== undefined && item.ownerId !== null && item.ownerId !== '') {
        return String(item.ownerId) === String(me.id);
    }
    if (!item.createdById) return true; // legacy / unowned — visible to everyone
    if (item.createdById === me.id) return true;
    if (includeAssignee) {
        if (String(item.assigneeId) === String(me.id)) return true;
        if (item.assignee && item.assignee === me.name) return true;
    }
    return false;
}

// "My tasks" filter inside a project — checks who the task is assigned to,
// regardless of who created/owns it.
function isAssignedToMe(task) {
    if (!task) return false;
    const me = getUser();
    if (task.assigneeId !== undefined && task.assigneeId !== null && task.assigneeId !== '') {
        return String(task.assigneeId) === String(me.id);
    }
    return !!(task.assignee && task.assignee === me.name);
}

// Toggles the "show only my projects" filter and re-renders the project list.
function toggleMineOnly() {
    showMineOnly = !showMineOnly;
    localStorage.setItem(DB.mineOnly, showMineOnly ? '1' : '0');
    loadProjects();
    updateUI();
}

// Toggles the "show only my tasks" filter for the current project's board/list.
function toggleTasksMineOnly() {
    tasksMineOnly = !tasksMineOnly;
    localStorage.setItem(DB.tasksMineOnly, tasksMineOnly ? '1' : '0');
    rerenderCurrentView();
    updateFilterBadge();
    closePopovers();
}

function renderUserUI() {
    const u = getUser();
    const ini = initials(u.name) || u.name.substring(0, 2);

    // Topbar user chip (avatar + name + role)
    const chipAvatar = document.getElementById('topUserAvatar');
    if (chipAvatar) {
        chipAvatar.style.setProperty('--hue', u.hue);
        chipAvatar.textContent = ini;
    }
    const chipName = document.getElementById('topUserName');
    if (chipName) chipName.textContent = u.name;
    const chipRole = document.getElementById('topUserRole');
    if (chipRole) chipRole.textContent = u.role || '';

    const topAvatar = document.querySelector('.topbar > .avatar');
    if (topAvatar) {
        topAvatar.style.setProperty('--hue', u.hue);
        topAvatar.textContent = ini;
        topAvatar.title = u.name;
    }

    const card = document.querySelector('.user-card');
    if (card) {
        const cardAvatar = card.querySelector('.avatar');
        if (cardAvatar) {
            cardAvatar.style.setProperty('--hue', u.hue);
            cardAvatar.textContent = ini;
        }
        const nameEl = card.querySelector('.user-name');
        if (nameEl) nameEl.textContent = u.name;
        const roleEl = card.querySelector('.user-role');
        if (roleEl) roleEl.textContent = u.role;
    }
}

function renderSyncStatusUI() {
    const settingsBtn = document.querySelector('.topbar-icon-btn[aria-label="הגדרות"]');
    if (!settingsBtn) return;
    settingsBtn.style.position = 'relative';
    let dot = settingsBtn.querySelector('.sync-status-dot');
    if (!window.FSSync || !FSSync.isSupported()) {
        if (dot) dot.remove();
        return;
    }
    if (!dot) {
        dot = document.createElement('span');
        dot.className = 'sync-status-dot';
        settingsBtn.appendChild(dot);
    }
    dot.classList.remove('connected', 'error', 'disconnected');
    dot.classList.add(FSSync.status);
    dot.title = FSSync.getStatusLabel();
}

function openUserProfileModal(mandatory = false) {
    closePopovers();
    const u = getUser();
    mandatoryProfileOpen = !!mandatory;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'taskModal';
    overlay.innerHTML = `
        <div class="modal" data-action="event.stopPropagation()">
            <div class="modal-header">
                <h2 class="modal-title">פרטי המשתמש</h2>
                ${mandatory ? '' : '<button class="modal-close" type="button" aria-label="סגור" data-action="closeModal()">×</button>'}
            </div>
            ${mandatory ? '<div class="modal-intro">ברוך הבא! הזן שם כדי שהמשימות והפרויקטים שתיצור ישויכו אליך.</div>' : ''}
            <div class="modal-body">
                <div class="field">
                    <label class="field-label">שם מלא *</label>
                    <input type="text" id="userName" class="field-input" value="${escapeHtml(u.name)}" placeholder="שם פרטי ושם משפחה">
                </div>
                <div class="field">
                    <label class="field-label">תפקיד</label>
                    <input type="text" id="userRole" class="field-input" value="${escapeHtml(u.role)}" placeholder="מנהל פרויקטים, מפתח...">
                </div>
                <div class="field">
                    <label class="field-label">צבע (גוון) — ${u.hue}°</label>
                    <input type="range" id="userHue" class="field-input" min="0" max="360" step="1" value="${u.hue}">
                    <div class="user-preview">
                        <div class="avatar avatar-lg" id="userPreviewAvatar" style="--hue: ${u.hue};">${escapeHtml(initials(u.name) || 'אא')}</div>
                        <div>
                            <div class="user-name" id="userPreviewName">${escapeHtml(u.name)}</div>
                            <div class="user-role" id="userPreviewRole">${escapeHtml(u.role)}</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                ${mandatory ? '' : '<button class="btn-secondary" type="button" data-action="closeModal()">ביטול</button>'}
                <button class="btn-primary" type="button" data-action="saveUserFromModal()">שמור</button>
            </div>
        </div>
    `;
    // Only allow dismiss-by-backdrop when the profile already exists. The
    // first-time setup is mandatory so a stray click can't discard it.
    if (!mandatory) {
        overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
    }
    document.body.appendChild(overlay);

    const nameInput = overlay.querySelector('#userName');
    const roleInput = overlay.querySelector('#userRole');
    const hueInput = overlay.querySelector('#userHue');
    const previewAvatar = overlay.querySelector('#userPreviewAvatar');
    const previewName = overlay.querySelector('#userPreviewName');
    const previewRole = overlay.querySelector('#userPreviewRole');
    const hueLabel = overlay.querySelector('.field-label + input + .user-preview')?.previousElementSibling?.previousElementSibling;

    const refreshPreview = () => {
        previewAvatar.textContent = initials(nameInput.value) || (nameInput.value || 'אא').substring(0, 2);
        previewAvatar.style.setProperty('--hue', hueInput.value);
        previewName.textContent = nameInput.value || '—';
        previewRole.textContent = roleInput.value || '';
    };
    nameInput.addEventListener('input', refreshPreview);
    roleInput.addEventListener('input', refreshPreview);
    hueInput.addEventListener('input', () => {
        refreshPreview();
        const lbl = overlay.querySelector('label[for="userHue"]') ||
            overlay.querySelectorAll('.field-label')[2];
        if (lbl) lbl.textContent = `צבע (גוון) — ${hueInput.value}°`;
    });

    setTimeout(() => nameInput.focus(), 50);
}

async function saveUserFromModal() {
    const name = document.getElementById('userName').value.trim();
    if (!name) { await showAlert('שם חובה'); return; }
    const role = document.getElementById('userRole').value.trim();
    const hue = parseInt(document.getElementById('userHue').value, 10) || 0;
    saveUser({ name, role, hue });
    mandatoryProfileOpen = false;
    closeModal();
}
