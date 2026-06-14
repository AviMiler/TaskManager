
function migrateTaskOwnership() {
    const tasks = getAllTasks();
    let changed = false;
    tasks.forEach(t => {
        if (t.createdBy === undefined) { t.createdBy = 'unknown'; changed = true; }
        if (t.updatedAt === undefined) { t.updatedAt = t.createdAt || new Date().toISOString(); changed = true; }
    });
    if (changed) localStorage.setItem(DB.tasks, JSON.stringify(tasks));
}

// ===== Storage =====
function getProjects() {
    const d = localStorage.getItem(DB.projects);
    return d ? JSON.parse(d) : [];
}

function getAllTasks() {
    const d = localStorage.getItem(DB.tasks);
    return d ? JSON.parse(d) : [];
}

function getTasks(projectId) {
    return getAllTasks().filter(t => t.projectId === projectId);
}

function saveProjects(projects) {
    localStorage.setItem(DB.projects, JSON.stringify(projects));
    createBackup();
}

function saveTasks(tasks) {
    localStorage.setItem(DB.tasks, JSON.stringify(tasks));
    createBackup();
}

function createBackup() {
    const backup = {
        projects: getProjects(),
        tasks: getAllTasks(),
        timestamp: new Date().toISOString()
    };
    localStorage.setItem(DB.backup, JSON.stringify(backup));
    if (window.FSSync) FSSync.scheduleSave();
}

// Column order is a per-record `order` field (last-write-wins like every other
// field), NOT the array position — array position is lost by mergeById during
// shared-file sync. Sorting on read is the single source of truth for ordering.
function sortColumns(cols) {
    return cols
        .map((c, i) => ({ c, i }))
        .sort((a, b) => {
            const ao = a.c.order != null ? a.c.order : a.i;
            const bo = b.c.order != null ? b.c.order : b.i;
            return ao - bo || a.i - b.i;
        })
        .map(x => x.c);
}

function getColumns() {
    const d = localStorage.getItem(DB.columns);
    if (!d) {
        saveColumns(DEFAULT_COLUMNS);
        return DEFAULT_COLUMNS.slice();
    }
    try {
        const cols = JSON.parse(d);
        if (Array.isArray(cols) && cols.length > 0) return sortColumns(cols);
    } catch (e) {}
    saveColumns(DEFAULT_COLUMNS);
    return DEFAULT_COLUMNS.slice();
}

function saveColumns(columns) {
    localStorage.setItem(DB.columns, JSON.stringify(columns));
    createBackup();
}

function getTaskTypes() {
    const d = localStorage.getItem(DB.taskTypes);
    if (!d) { saveTaskTypes(DEFAULT_TASK_TYPES); return DEFAULT_TASK_TYPES.slice(); }
    try {
        const ts = JSON.parse(d);
        if (Array.isArray(ts) && ts.length > 0) return ts;
    } catch (e) {}
    saveTaskTypes(DEFAULT_TASK_TYPES);
    return DEFAULT_TASK_TYPES.slice();
}

function saveTaskTypes(types) {
    localStorage.setItem(DB.taskTypes, JSON.stringify(types));
}

async function addColumn(name) {
    name = (name || '').trim();
    if (!name) return;
    const columns = getColumns();
    const safeName = escapeHtml(name);
    if (columns.find(c => c.name === safeName)) {
        await showAlert('עמודה עם שם זה כבר קיימת');
        return;
    }
    const id = 'col_' + newId();
    const maxOrder = columns.reduce((m, c) => Math.max(m, c.order != null ? c.order : 0), -1);
    columns.push({ id, name: safeName, hue: (columns.length * 47) % 360, order: maxOrder + 1, updatedAt: new Date().toISOString() });
    saveColumns(columns);
    renderKanban();
}

async function deleteColumn(id) {
    const columns = getColumns();
    const col = columns.find(c => c.id === id);
    if (!col) return;
    const tasksInColumn = getTasks(currentProjectId).filter(t => t.state === id).length;
    if (tasksInColumn > 0) {
        await showAlert(`לא ניתן למחוק את העמודה "${unescapeForInput(col.name)}" - יש בה ${tasksInColumn} משימות.\nהעבר אותן לעמודה אחרת לפני המחיקה.`);
        return;
    }
    if (columns.length <= 1) {
        await showAlert('חייבת להיות לפחות עמודה אחת');
        return;
    }
    const ok = await showConfirm(`למחוק את העמודה "${unescapeForInput(col.name)}"?`);
    if (!ok) return;
    saveColumns(columns.filter(c => c.id !== id));
    renderKanban();
}

function renameColumn(id, newName) {
    newName = (newName || '').trim();
    if (!newName) return;
    const columns = getColumns();
    const col = columns.find(c => c.id === id);
    if (!col) return;
    col.name = escapeHtml(newName);
    saveColumns(columns);
    renderKanban();
}
