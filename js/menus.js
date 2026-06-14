// ===== Notifications / Settings / User menus =====
function openNotificationsMenu(anchor) {
    closePopovers();
    const tasks = getAllTasks();
    const cols = getColumns();
    const lastColId = cols.length ? cols[cols.length - 1].id : null;
    const overdue = tasks.filter(t => t.state !== lastColId && t.dueIn !== null && t.dueIn !== undefined && t.dueIn <= 7);

    const pop = document.createElement('div');
    pop.className = 'popover';
    pop.id = 'activePopover';
    pop.innerHTML = `
        <div class="popover-title">התראות</div>
        ${overdue.length === 0
            ? `<div class="popover-empty">${ICONS.check} אין התראות חדשות</div>`
            : `<div class="popover-menu">${overdue.map(t => {
                const proj = getProjects().find(p => p.id === t.projectId);
                const urgency = t.dueIn < 0 ? 'באיחור!' : t.dueIn === 0 ? 'היום' : `בעוד ${t.dueIn} ימים`;
                return `
                    <div class="popover-notif" data-action="jumpToTask(${t.projectId}, ${t.id})">
                        <div class="notif-title">${t.title}</div>
                        <div class="notif-meta">${proj ? proj.name : ''} · ${urgency}</div>
                    </div>
                `;
            }).join('')}</div>`
        }
    `;
    positionPopover(pop, anchor);
    document.body.appendChild(pop);
}

function jumpToTask(projectId, taskId) {
    closePopovers();
    if (projectId !== currentProjectId) selectProject(projectId);
    openEditModal(taskId);
}

function openSettingsMenu(anchor) {
    closePopovers();
    const pop = document.createElement('div');
    pop.className = 'popover';
    pop.id = 'activePopover';
    const fsLabel = window.FSSync ? FSSync.getStatusLabel() : 'תכונה זו זמינה רק ב-Chrome/Edge';
    const fsDisabled = !window.FSSync || !FSSync.isSupported();
    const canCreate = window.FSSync && FSSync.supportsSavePicker();
    pop.innerHTML = `
        <div class="popover-title">הגדרות</div>
        <div class="popover-menu">
            <button class="popover-menu-item" type="button" data-action="exportData()">${ICONS.export} ייצא JSON</button>
            <button class="popover-menu-item" type="button" data-action="triggerImportFile()">${ICONS.import} ייבא JSON</button>
            <button class="popover-menu-item" type="button" data-action="showBackupInfo()">${ICONS.save} פרטי גיבוי</button>
            <button class="popover-menu-item" type="button" data-action="openManageTypesModal()">${ICONS.tag} ניהול סוגי משימות</button>
            <button class="popover-menu-item" type="button" data-action="openTeamModal()">👥 ניהול צוות</button>
            <button class="popover-menu-item" type="button" ${fsDisabled ? 'disabled title="תכונה זו זמינה רק ב-Chrome/Edge"' : ''} data-action="FSSync.connect()">${ICONS.save} ${fsLabel}</button>
            <button class="popover-menu-item" type="button" ${canCreate ? '' : 'disabled title="תכונה זו זמינה רק ב-Chrome/Edge"'} data-action="FSSync.createNew()">${ICONS.save} בחר מיקום לקובץ משותף חדש…</button>
            <button class="popover-menu-item danger" type="button" data-action="clearAllData()">${ICONS.trash} נקה את כל הנתונים</button>
        </div>
    `;
    positionPopover(pop, anchor);
    document.body.appendChild(pop);
}

function openUserMenu(anchor) {
    closePopovers();
    const projects = getProjects().length;
    const tasks = getAllTasks().length;
    const cols = getColumns();
    const lastColId = cols.length ? cols[cols.length - 1].id : null;
    const done = getAllTasks().filter(t => t.state === lastColId).length;
    const u = getUser();

    const pop = document.createElement('div');
    pop.className = 'popover';
    pop.id = 'activePopover';
    pop.innerHTML = `
        <div class="popover-title">${escapeHtml(u.name)}</div>
        <div class="popover-stats">
            <div class="stat"><div class="stat-num">${projects}</div><div class="stat-label">פרויקטים</div></div>
            <div class="stat"><div class="stat-num">${tasks}</div><div class="stat-label">משימות</div></div>
            <div class="stat"><div class="stat-num">${done}</div><div class="stat-label">הושלמו</div></div>
        </div>
        <div class="popover-menu">
            <button class="popover-menu-item" type="button" data-action="openUserProfileModal()">👤 ערוך פרופיל</button>
            <button class="popover-menu-item" type="button" data-action="exportData()">${ICONS.export} ייצא נתונים</button>
            <button class="popover-menu-item" type="button" data-action="showBackupInfo()">${ICONS.save} פרטי גיבוי</button>
        </div>
    `;
    positionPopover(pop, anchor);
    document.body.appendChild(pop);
}

function buildColorSwatches(selectedHue) {
    return `<div class="color-swatches">
        ${PRESET_HUES.map(h => `<button class="color-swatch${h === selectedHue ? ' selected' : ''}" type="button" data-hue="${h}" style="--sw-hue:${h};" aria-label="גוון ${h}"></button>`).join('')}
    </div>`;
}

function openManageTypesModal() {
    closePopovers();

    const renderList = (container) => {
        const types = getTaskTypes();
        if (types.length === 0) {
            container.innerHTML = '<div style="color:var(--ink-f);font-size:13px;padding:12px 0;">אין סוגים מוגדרים</div>';
            return;
        }
        container.innerHTML = types.map(ty => `
            <div class="manage-type-row" data-type-id="${ty.id}">
                <span class="task-type-badge" style="--type-hue:${ty.hue};">${ty.name}</span>
                <div class="manage-type-row-actions">
                    <div class="color-swatches color-swatches-inline">
                        ${PRESET_HUES.map(h => `<button class="color-swatch${h === ty.hue ? ' selected' : ''}" type="button" data-hue="${h}" data-type-id="${ty.id}" style="--sw-hue:${h};"></button>`).join('')}
                    </div>
                    <button class="manage-type-delete" type="button" data-type-id="${ty.id}" aria-label="מחק">×</button>
                </div>
            </div>
        `).join('');

        // Color change for existing types
        container.querySelectorAll('.color-swatch[data-type-id]').forEach(swatch => {
            swatch.addEventListener('click', () => {
                const id = swatch.dataset.typeId;
                const hue = Number(swatch.dataset.hue);
                const types = getTaskTypes();
                const ty = types.find(x => x.id === id);
                if (!ty) return;
                ty.hue = hue;
                saveTaskTypes(types);
                renderList(container);
            });
        });

        container.querySelectorAll('.manage-type-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.typeId;
                const type = getTaskTypes().find(x => x.id === id);
                const usedCount = getAllTasks().filter(x => x.taskType === id).length;
                if (usedCount > 0) {
                    const ok = await showConfirm(
                        `הסוג "${type.name}" משמש ב-${usedCount} משימות. למחוק?`,
                        'מחיקת סוג', 'מחק', 'ביטול'
                    );
                    if (!ok) return;
                    saveTasks(getAllTasks().map(t => t.taskType === id ? { ...t, taskType: '' } : t));
                }
                saveTaskTypes(getTaskTypes().filter(x => x.id !== id));
                renderList(container);
            });
        });
    };

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'manageTypesModal';
    overlay.innerHTML = `
        <div class="modal" data-action="event.stopPropagation()" style="max-width:440px;">
            <div class="modal-header">
                <h2 class="modal-title">ניהול סוגי משימות</h2>
                <button class="modal-close" type="button" aria-label="סגור" data-action="closeManageTypesModal()">×</button>
            </div>
            <div class="modal-body">
                <div id="typesList"></div>
                <div class="manage-type-add">
                    <div class="manage-type-add-row">
                        <input type="text" id="newTypeName" class="field-input" placeholder="שם הסוג החדש...">
                        <button class="btn-primary" type="button" id="addTypeBtn">הוסף</button>
                    </div>
                    <div class="manage-type-add-color">
                        <span class="field-label" style="font-size:11px;">צבע:</span>
                        ${buildColorSwatches(PRESET_HUES[5])}
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-primary" type="button" data-action="closeManageTypesModal()">סגור</button>
            </div>
        </div>
    `;

    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeManageTypesModal(); });
    document.body.appendChild(overlay);

    const container = overlay.querySelector('#typesList');
    renderList(container);

    // Track selected hue for new type
    let selectedHue = PRESET_HUES[5];
    overlay.querySelectorAll('.manage-type-add .color-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
            selectedHue = Number(swatch.dataset.hue);
            overlay.querySelectorAll('.manage-type-add .color-swatch').forEach(s => s.classList.toggle('selected', Number(s.dataset.hue) === selectedHue));
        });
    });

    const addBtn = overlay.querySelector('#addTypeBtn');
    const nameInput = overlay.querySelector('#newTypeName');
    const doAdd = async () => {
        const name = nameInput.value.trim();
        if (!name) return;
        const types = getTaskTypes();
        if (types.find(x => x.name.toLowerCase() === name.toLowerCase())) {
            await showAlert('סוג עם שם זה כבר קיים');
            return;
        }
        types.push({ id: 'type_' + newId(), name, hue: selectedHue });
        saveTaskTypes(types);
        nameInput.value = '';
        renderList(container);
    };
    addBtn.addEventListener('click', doAdd);
    nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') doAdd(); });
}

function closeManageTypesModal() {
    const m = document.getElementById('manageTypesModal');
    if (m) m.remove();
}

// ===== Team directory =====
// People can no longer be added manually — everyone registers themselves by
// logging in with their national id (תז). This modal is therefore a read-only
// directory of who has registered. Renaming is done by each person in their
// own profile; the only edit kept here is removing a stale/duplicate entry.
function openTeamModal() {
    closePopovers();

    const me = getUser();
    const members = getMembers().slice()
        .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'he'));

    const rowsHtml = members.length ? members.map(m => {
        const ini = initials(m.name) || (m.name || '').substring(0, 2);
        const isMe = String(m.id) === String(me.id);
        return `
        <div class="team-row" data-member-id="${escapeAttr(String(m.id))}">
            <div class="avatar avatar-sm" style="--hue:${m.hue};">${escapeHtml(ini)}</div>
            <div class="team-row-meta">
                <span class="user-name">${escapeHtml(m.name)}${isMe ? ' <span class="team-me-badge">אני</span>' : ''}</span>
                <span class="team-row-sub">${m.role ? escapeHtml(m.role) + ' · ' : ''}ת"ז ${escapeHtml(maskNationalId(String(m.id)))}</span>
            </div>
            <button class="manage-type-delete" type="button" data-del-member="${escapeAttr(String(m.id))}" aria-label="הסר" ${isMe ? 'disabled title="לא ניתן להסיר את עצמך"' : ''}>×</button>
        </div>`;
    }).join('') : '<div style="color:var(--ink-f);font-size:13px;padding:12px 0;">אף אחד לא נרשם עדיין. כל אדם מצטרף בעצמו דרך כניסה עם תעודת זהות.</div>';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'teamModal';
    overlay.innerHTML = `
        <div class="modal" data-action="event.stopPropagation()" style="max-width:440px;">
            <div class="modal-header">
                <h2 class="modal-title">צוות</h2>
                <button class="modal-close" type="button" aria-label="סגור" data-action="closeTeamModal()">×</button>
            </div>
            <div class="modal-body">
                <p style="color:var(--ink-f);font-size:12px;margin-bottom:10px;">כל אדם מצטרף בעצמו בכניסה עם תעודת זהות. כאן רואים את כל מי שנרשם.</p>
                <div id="teamList">${rowsHtml}</div>
            </div>
            <div class="modal-footer">
                <button class="btn-primary" type="button" data-action="closeTeamModal()">סגור</button>
            </div>
        </div>
    `;

    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeTeamModal(); });
    document.body.appendChild(overlay);

    // The single allowed edit: remove a stale entry (e.g. a duplicate from a
    // typo). Tasks assigned to that person are offered a reassignment first.
    overlay.querySelectorAll('[data-del-member]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = String(btn.dataset.delMember);
            const m = getMembers().find(x => String(x.id) === id);
            if (!m) return;
            const usedTasks = getAllTasks().filter(t => String(t.assigneeId) === id);
            if (usedTasks.length > 0) {
                const others = getMembers().filter(x => String(x.id) !== id);
                const options = [
                    { value: '', label: 'ללא אחראי' },
                    ...others.map(o => ({ value: o.id, label: o.name }))
                ];
                const choice = await showSelect(
                    `"${m.name}" מוגדר כאחראי ב-${usedTasks.length} משימות. בחר למי לשייך אותן לפני ההסרה:`,
                    options, 'הסרת איש צוות', 'הסר ושייך מחדש', 'ביטול'
                );
                if (choice === null) return;
                const newName = choice ? memberName(choice) : '';
                saveTasks(getAllTasks().map(t =>
                    String(t.assigneeId) === id
                        ? { ...t, assigneeId: choice || null, assignee: newName, updatedAt: new Date().toISOString() }
                        : t
                ));
            } else {
                const ok = await showConfirm(`להסיר את "${m.name}"?`, 'הסרת איש צוות', 'הסר', 'ביטול');
                if (!ok) return;
            }
            removeMember(id);
            loadProjects();
            rerenderCurrentView();
            closeTeamModal();
            openTeamModal();
        });
    });
}

function closeTeamModal() {
    const m = document.getElementById('teamModal');
    if (m) m.remove();
}
