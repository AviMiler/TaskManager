// ===== Team members =====
// A shared roster of people. Each member has a stable `id`; the displayed name
// is looked up by id, so renaming a member updates every reference (the name
// cached on tasks is rewritten by propagateMemberName). Synced via FSSync.
function getMembers() {
    try {
        const list = JSON.parse(localStorage.getItem(DB.members) || '[]');
        return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
}

function saveMembers(members) {
    localStorage.setItem(DB.members, JSON.stringify(members));
    createBackup();
}

function getMemberById(id) {
    if (id === undefined || id === null || id === '') return null;
    return getMembers().find(m => String(m.id) === String(id)) || null;
}

function memberName(id) {
    const m = getMemberById(id);
    return m ? m.name : '';
}

// Create or update a member by id. Returns the member.
function upsertMember({ id, name, role, hue }) {
    const members = getMembers();
    const now = new Date().toISOString();
    let m = members.find(x => String(x.id) === String(id));
    if (m) {
        if (name !== undefined) m.name = name;
        if (role !== undefined) m.role = role;
        if (hue !== undefined && hue !== null) m.hue = hue;
        m.updatedAt = now;
    } else {
        m = {
            id,
            name: name || '',
            role: role || '',
            hue: (hue !== undefined && hue !== null) ? hue : nameHue(name || ''),
            createdAt: now,
            updatedAt: now
        };
        members.push(m);
    }
    saveMembers(members);
    return m;
}

// Add a brand-new member (manual roster entry) with a fresh id.
function addMember(name, role, hue) {
    name = (name || '').trim();
    if (!name) return null;
    const existing = getMembers().find(m => m.name === name);
    if (existing) return existing;
    return upsertMember({ id: newId(), name, role, hue });
}

// Rename a member and propagate the new name to every task that references it.
function renameMember(id, newName) {
    newName = (newName || '').trim();
    if (!newName) return;
    upsertMember({ id, name: newName });
    propagateMemberName(id);
}

function removeMember(id) {
    saveMembers(getMembers().filter(m => String(m.id) !== String(id)));
}

// Rewrite the cached name on every task that points at this member, so the
// existing name-based render/filter/search code keeps showing the current name.
function propagateMemberName(id) {
    const name = escapeHtml(memberName(id));
    const tasks = getAllTasks();
    const now = new Date().toISOString();
    let changed = false;
    tasks.forEach(t => {
        if (String(t.assigneeId) === String(id) && t.assignee !== name) {
            t.assignee = name; t.updatedAt = now; changed = true;
        }
        if (String(t.createdById) === String(id) && t.createdBy !== name) {
            t.createdBy = name; t.updatedAt = now; changed = true;
        }
    });
    if (changed) saveTasks(tasks);
}

// Build the <option> list for the assignee dropdown.
function assigneeOptionsHtml(selectedId) {
    const members = getMembers().slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'he'));
    const opts = members.map(m =>
        `<option value="${m.id}" ${String(selectedId) === String(m.id) ? 'selected' : ''}>${escapeHtml(m.name)}</option>`
    ).join('');
    return `<option value="">— ללא —</option>${opts}<option value="__add__">+ הוסף איש צוות…</option>`;
}

// Seed the roster from existing data and link tasks to members by id.
// Runs only once: otherwise it would keep re-adding members that were
// deliberately deleted from the team, since deleting a member doesn't
// remove their createdById from past tasks.
function migrateMembersAndAssignees() {
    if (localStorage.getItem(DB.membersMigrated)) return;
    localStorage.setItem(DB.membersMigrated, '1');

    const u = getUser();
    upsertMember({ id: u.id, name: u.name, role: u.role, hue: u.hue });

    const tasks = getAllTasks();
    let tasksChanged = false;
    tasks.forEach(t => {
        // Seed a member for each known creator.
        if (t.createdById && t.createdBy && t.createdBy !== 'unknown' &&
            !getMemberById(t.createdById)) {
            upsertMember({ id: t.createdById, name: t.createdBy });
        }
        // Link legacy free-text assignees to a member by name.
        if (t.assignee && (t.assigneeId === undefined || t.assigneeId === null)) {
            let m = getMembers().find(x => x.name === t.assignee);
            if (!m) m = upsertMember({ id: newId(), name: t.assignee });
            t.assigneeId = m.id;
            tasksChanged = true;
        }
    });
    if (tasksChanged) saveTasks(tasks);
}
