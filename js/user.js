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
        // A project belongs to me when I'm in its member list. The owner and
        // creator always count as implicit members so they never lose sight
        // of their own project even if not listed explicitly.
        if (item.memberIds.map(String).includes(String(me.id))) return true;
        if (item.ownerId !== undefined && item.ownerId !== null && item.ownerId !== '') {
            if (String(item.ownerId) === String(me.id)) return true;
        }
        if (item.createdById && String(item.createdById) === String(me.id)) return true;
        return false;
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

// Log in as a national id (תז): set identity, migrate legacy refs once, and
// make sure a roster record exists for this person. `profile` carries the
// name/role/hue from the login form (used when the id is brand new or edited).
function login(nationalId, profile) {
    setIdentity(nationalId);
    migrateLegacyIdentity(nationalId);
    if (profile) {
        localStorage.setItem(DB.user, JSON.stringify({
            name: profile.name, role: profile.role, hue: profile.hue
        }));
    }
    const u = getUser();
    upsertMember({ id: u.id, name: u.name, role: u.role, hue: u.hue });
    propagateMemberName(u.id);
    migrateMembersAndAssignees();
    renderUserUI();
}

// Log out and return to the login screen. Clears only the "who am I" pointer
// and this browser's cached profile — the shared roster and all data stay put,
// so logging back in (here or with another id) restores everything.
async function logout() {
    const ok = await showConfirm('להתנתק? תוכל להתחבר שוב עם תעודת זהות.', 'התנתקות', 'התנתק', 'ביטול');
    if (!ok) return;
    clearIdentity();
    localStorage.removeItem(DB.user);
    location.reload();
}

function openUserProfileModal(mandatory = false) {
    closePopovers();
    const loggedIn = isLoggedIn();
    const u = getUser();
    const myId = getClientId();
    mandatoryProfileOpen = !!mandatory;

    // When logging in there is no "current user" yet, so start the form blank
    // instead of showing the placeholder default profile.
    const initName = loggedIn ? u.name : '';
    const initRole = loggedIn ? u.role : '';
    const initHue = loggedIn ? u.hue : 200;

    // When logged in the national id is fixed (changing it = switching person,
    // which is what logout/login is for), so show it read-only. When logging in
    // it's the primary, editable field.
    const idFieldHtml = loggedIn
        ? `<div class="field">
                <label class="field-label">תעודת זהות</label>
                <input type="text" class="field-input" value="${escapeHtml(maskNationalId(myId))}" disabled dir="ltr">
           </div>`
        : `<div class="field">
                <label class="field-label">תעודת זהות *</label>
                <input type="text" id="userNationalId" class="field-input" inputmode="numeric" dir="ltr" placeholder="מספר תעודת זהות" autocomplete="off">
                <div class="field-hint" id="userIdHint"></div>
           </div>`;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'taskModal';
    overlay.innerHTML = `
        <div class="modal" data-action="event.stopPropagation()">
            <div class="modal-header">
                <h2 class="modal-title">${loggedIn ? 'פרטי המשתמש' : 'כניסה למערכת'}</h2>
                ${mandatory ? '' : '<button class="modal-close" type="button" aria-label="סגור" data-action="closeModal()">×</button>'}
            </div>
            ${!loggedIn ? '<div class="modal-intro">הזן תעודת זהות כדי להיכנס. אם זו הכניסה הראשונה שלך, הוסף גם שם. כך כל המשימות והפרויקטים משויכים אליך — בכל דפדפן.</div>' : ''}
            <div class="modal-body">
                ${idFieldHtml}
                <div class="field">
                    <label class="field-label">שם מלא *</label>
                    <input type="text" id="userName" class="field-input" value="${escapeHtml(initName)}" placeholder="שם פרטי ושם משפחה">
                </div>
                <div class="field">
                    <label class="field-label">תפקיד</label>
                    <input type="text" id="userRole" class="field-input" value="${escapeHtml(initRole)}" placeholder="מנהל פרויקטים, מפתח...">
                </div>
                <div class="field">
                    <label class="field-label">צבע (גוון) — ${initHue}°</label>
                    <input type="range" id="userHue" class="field-input" min="0" max="360" step="1" value="${initHue}">
                    <div class="user-preview">
                        <div class="avatar avatar-lg" id="userPreviewAvatar" style="--hue: ${initHue};">${escapeHtml(initials(initName) || 'אא')}</div>
                        <div>
                            <div class="user-name" id="userPreviewName">${escapeHtml(initName) || '—'}</div>
                            <div class="user-role" id="userPreviewRole">${escapeHtml(initRole)}</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                ${loggedIn ? '<button class="btn-secondary btn-logout" type="button" data-action="logout()">התנתק / החלף חשבון</button>' : ''}
                <div style="margin-inline-start:auto; display:flex; gap:8px;">
                    ${mandatory ? '' : '<button class="btn-secondary" type="button" data-action="closeModal()">ביטול</button>'}
                    <button class="btn-primary" type="button" data-action="saveUserFromModal()">${loggedIn ? 'שמור' : 'כניסה'}</button>
                </div>
            </div>
        </div>
    `;
    // Only allow dismiss-by-backdrop when already logged in. The first-time
    // login is mandatory so a stray click can't discard it.
    if (!mandatory) {
        overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
    }
    document.body.appendChild(overlay);

    const idInput = overlay.querySelector('#userNationalId');
    const idHint = overlay.querySelector('#userIdHint');
    const nameInput = overlay.querySelector('#userName');
    const roleInput = overlay.querySelector('#userRole');
    const hueInput = overlay.querySelector('#userHue');
    const previewAvatar = overlay.querySelector('#userPreviewAvatar');
    const previewName = overlay.querySelector('#userPreviewName');
    const previewRole = overlay.querySelector('#userPreviewRole');

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
        // Fields are always: id, name, role, hue → the colour label is index 3.
        const lbl = overlay.querySelectorAll('.field-label')[3];
        if (lbl) lbl.textContent = `צבע (גוון) — ${hueInput.value}°`;
    });

    // While logging in: when the typed id is already known, prefill the person's
    // name/role/colour so they really only need to type the number ("just the
    // id on a new browser"). Also surface a soft validity hint.
    if (idInput) {
        idInput.addEventListener('input', () => {
            const tz = normalizeNationalId(idInput.value);
            if (idInput.value !== tz) idInput.value = tz;
            const known = tz ? getMemberById(tz) : null;
            if (known) {
                nameInput.value = known.name || '';
                roleInput.value = known.role || '';
                if (known.hue !== undefined && known.hue !== null) {
                    hueInput.value = known.hue;
                }
                refreshPreview();
                idHint.textContent = `מזוהה: ${known.name}`;
                idHint.className = 'field-hint field-hint-ok';
            } else if (tz && tz.length >= 5 && !isValidIsraeliId(tz)) {
                idHint.textContent = 'תעודת הזהות אינה תקינה (ספרת ביקורת) — אפשר להמשיך בכל זאת';
                idHint.className = 'field-hint field-hint-warn';
            } else {
                idHint.textContent = '';
                idHint.className = 'field-hint';
            }
        });
    }

    setTimeout(() => (idInput || nameInput).focus(), 50);
}

async function saveUserFromModal() {
    const loggedIn = isLoggedIn();
    const idInput = document.getElementById('userNationalId');

    let nationalId = getClientId();
    if (!loggedIn) {
        nationalId = normalizeNationalId(idInput ? idInput.value : '');
        if (!nationalId) { await showAlert('תעודת זהות חובה'); return; }
        if (!isValidIsraeliId(nationalId)) {
            const ok = await showConfirm('תעודת הזהות אינה תקינה (ספרת ביקורת). להמשיך בכל זאת?', 'אזהרה', 'המשך', 'תיקון');
            if (!ok) return;
        }
    }

    const name = document.getElementById('userName').value.trim();
    if (!name) { await showAlert('שם חובה'); return; }
    const role = document.getElementById('userRole').value.trim();
    const hue = parseInt(document.getElementById('userHue').value, 10) || 0;

    if (!loggedIn) {
        login(nationalId, { name, role, hue });
    } else {
        saveUser({ name, role, hue });
    }

    mandatoryProfileOpen = false;
    closeModal();
    loadProjects();
    updateUI();
}
