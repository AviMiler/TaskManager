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

// ===== Team management =====
// All edits (renames, additions, deletions, reassignments) are staged in
// memory and only written to storage when the user clicks "שמור". Closing
// the modal (×) discards any unsaved changes.
function openTeamModal() {
    closePopovers();

    const me = getUser();
    let working = getMembers().map(m => ({ ...m })); // staged roster
    const removedIds = new Set();       // ids to delete on save
    const renames = new Map();          // id -> new name
    const newMembers = new Set();       // ids of not-yet-persisted members
    const reassignments = new Map();    // removed member id -> new assigneeId or null

    const renderList = (container) => {
        const visible = working
            .filter(m => !removedIds.has(String(m.id)))
            .slice()
            .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'he'));

        if (visible.length === 0) {
            container.innerHTML = '<div style="color:var(--ink-f);font-size:13px;padding:12px 0;">אין אנשי צוות עדיין</div>';
            return;
        }
        container.innerHTML = visible.map(m => {
            const name = renames.get(String(m.id)) ?? m.name;
            const ini = initials(name) || (name || '').substring(0, 2);
            const isMe = String(m.id) === String(me.id);
            return `
            <div class="team-row" data-member-id="${m.id}">
                <div class="avatar avatar-sm" style="--hue:${m.hue};">${escapeHtml(ini)}</div>
                <input type="text" class="field-input team-name-input" value="${escapeHtml(name)}" data-member-id="${m.id}">
                ${isMe ? '<span class="team-me-badge">אני</span>' : ''}
                <button class="manage-type-delete" type="button" data-del-member="${m.id}" aria-label="מחק" ${isMe ? 'disabled title="לא ניתן למחוק את עצמך"' : ''}>×</button>
            </div>`;
        }).join('');

        container.querySelectorAll('.team-name-input').forEach(input => {
            input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });
            input.addEventListener('blur', () => {
                const id = String(input.dataset.memberId);
                const m = working.find(x => String(x.id) === id);
                const newName = input.value.trim();
                const current = renames.get(id) ?? (m ? m.name : '');
                if (!newName || newName === current) { input.value = current; return; }
                renames.set(id, newName);
            });
        });

        container.querySelectorAll('[data-del-member]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = String(btn.dataset.delMember);
                const m = working.find(x => String(x.id) === id);
                if (!m) return;
                const displayName = renames.get(id) ?? m.name;

                if (newMembers.has(id)) {
                    // Not persisted yet - just drop it, no tasks can reference it.
                    working = working.filter(x => String(x.id) !== id);
                    newMembers.delete(id);
                    renames.delete(id);
                    renderList(container);
                    return;
                }

                const usedTasks = getAllTasks().filter(t => String(t.assigneeId) === id);
                if (usedTasks.length > 0) {
                    const others = working.filter(x => !removedIds.has(String(x.id)) && String(x.id) !== id);
                    const options = [
                        { value: '', label: 'ללא אחראי' },
                        ...others.map(o => ({ value: o.id, label: renames.get(String(o.id)) ?? o.name }))
                    ];
                    const choice = await showSelect(
                        `"${displayName}" מוגדר כאחראי ב-${usedTasks.length} משימות. בחר למי לשייך את המשימות לפני המחיקה:`,
                        options,
                        'מחיקת איש צוות',
                        'מחק ושייך מחדש',
                        'ביטול'
                    );
                    if (choice === null) return;
                    reassignments.set(id, choice || null);
                } else {
                    const ok = await showConfirm(`למחוק את "${displayName}" מהצוות?`, 'מחיקת איש צוות', 'מחק', 'ביטול');
                    if (!ok) return;
                }
                removedIds.add(id);
                renderList(container);
            });
        });
    };

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'teamModal';
    overlay.innerHTML = `
        <div class="modal" data-action="event.stopPropagation()" style="max-width:440px;">
            <div class="modal-header">
                <h2 class="modal-title">ניהול צוות</h2>
                <button class="modal-close" type="button" aria-label="סגור" data-action="closeTeamModal()">×</button>
            </div>
            <div class="modal-body">
                <p style="color:var(--ink-f);font-size:12px;margin-bottom:10px;">שינוי שם מתעדכן אוטומטית בכל המשימות המשויכות.</p>
                <div id="teamList"></div>
                <div class="manage-type-add">
                    <div class="manage-type-add-row">
                        <input type="text" id="newMemberName" class="field-input" placeholder="שם איש צוות חדש...">
                        <button class="btn-primary" type="button" id="addMemberBtn">הוסף</button>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" type="button" data-action="closeTeamModal()">ביטול</button>
                <button class="btn-primary" type="button" id="saveTeamBtn">שמור</button>
            </div>
        </div>
    `;

    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeTeamModal(); });
    document.body.appendChild(overlay);

    const container = overlay.querySelector('#teamList');
    renderList(container);

    const addBtn = overlay.querySelector('#addMemberBtn');
    const nameInput = overlay.querySelector('#newMemberName');
    const doAdd = async () => {
        const name = nameInput.value.trim();
        if (!name) return;
        const exists = working.some(m => !removedIds.has(String(m.id)) && (renames.get(String(m.id)) ?? m.name) === name);
        if (exists) {
            await showAlert('איש צוות עם שם זה כבר קיים');
            return;
        }
        const id = newUniqueId(working.map(m => m.id));
        working.push({ id, name, role: '', hue: nameHue(name) });
        newMembers.add(String(id));
        nameInput.value = '';
        renderList(container);
    };
    addBtn.addEventListener('click', doAdd);
    nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') doAdd(); });

    overlay.querySelector('#saveTeamBtn').addEventListener('click', () => {
        // Apply removals first (with their task reassignments), so renames
        // below don't bother touching members that are about to be deleted.
        removedIds.forEach(id => {
            if (reassignments.has(id)) {
                const newAssigneeId = reassignments.get(id);
                const newAssigneeName = newAssigneeId ? (renames.get(String(newAssigneeId)) ?? memberName(newAssigneeId)) : '';
                saveTasks(getAllTasks().map(t =>
                    String(t.assigneeId) === id
                        ? { ...t, assigneeId: newAssigneeId, assignee: newAssigneeName, updatedAt: new Date().toISOString() }
                        : t
                ));
            }
            removeMember(id);
        });

        // New members that weren't deleted before save.
        newMembers.forEach(id => {
            if (removedIds.has(id)) return;
            const m = working.find(x => String(x.id) === id);
            if (m) upsertMember({ id: m.id, name: renames.get(id) ?? m.name, role: m.role, hue: m.hue });
        });

        // Renames for existing, non-removed, non-new members.
        renames.forEach((newName, id) => {
            if (removedIds.has(id) || newMembers.has(id)) return;
            renameMember(id, newName);
            if (id === String(me.id)) {
                const u = getUser();
                saveUser({ name: newName, role: u.role, hue: u.hue });
            }
        });

        loadProjects();
        rerenderCurrentView();
        closeTeamModal();
    });
}

function closeTeamModal() {
    const m = document.getElementById('teamModal');
    if (m) m.remove();
}
