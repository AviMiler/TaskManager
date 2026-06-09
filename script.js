// ===== Storage Keys =====
const DB = {
    projects: 'tb_projects',
    tasks: 'tb_tasks',
    backup: 'tb_backup',
    currentProject: 'tb_currentProject',
    columns: 'tb_columns'
};

let currentProjectId = null;
let editingTaskId = null;
let draggingTaskId = null;
let nextTaskId = 1000;
let currentView = 'kanban'; // 'kanban' | 'list'
let listScope = 'current'; // 'current' | 'all'
let activeFilters = { priority: null, tag: null, assignee: null };
let activeSort = 'created-desc'; // 'created-desc' | 'created-asc' | 'priority' | 'title' | 'due'

// Hue palette for project dots
const HUES = [230, 160, 40, 290, 0, 60, 120, 180, 260, 320];

// Tag colors known (Hebrew)
const KNOWN_TAGS = ['מסמכים', 'פגישה', 'פנימי', 'bug', 'feature'];

// Default kanban columns
const DEFAULT_COLUMNS = [
    { id: 'todo',    name: 'To Do',    hue: 220 },
    { id: 'doing',   name: 'Active',   hue: 210 },
    { id: 'testing', name: 'בבדיקות',  hue: 35  },
    { id: 'done',    name: 'Closed',   hue: 145 }
];

// ===== Custom Dialogs =====
function _buildDialog({ title, message, inputDefault, buttons }) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';

        const box = document.createElement('div');
        box.className = 'dialog-box';
        box.setAttribute('role', 'dialog');
        box.setAttribute('aria-modal', 'true');

        const titleEl = title ? `<div class="dialog-title">${escapeHtml(title)}</div>` : '';
        const msgEl   = message ? `<div class="dialog-message">${escapeHtml(message).replace(/\n/g, '<br>')}</div>` : '';
        const inputEl = inputDefault !== undefined
            ? `<input id="dialogInput" class="dialog-input field-input" type="text" value="${escapeHtml(inputDefault)}">`
            : '';

        box.innerHTML = `
            ${titleEl}
            ${msgEl}
            ${inputEl}
            <div class="dialog-btns"></div>
        `;

        const btnsEl = box.querySelector('.dialog-btns');
        buttons.forEach(({ label, value, primary }) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = primary ? 'btn-primary' : 'btn-secondary';
            btn.textContent = label;
            btn.addEventListener('click', () => {
                overlay.remove();
                if (inputDefault !== undefined) {
                    resolve(value === true ? box.querySelector('#dialogInput').value : null);
                } else {
                    resolve(value);
                }
            });
            btnsEl.appendChild(btn);
        });

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        const input = box.querySelector('#dialogInput');
        if (input) {
            input.focus();
            input.select();
            input.addEventListener('keydown', e => {
                if (e.key === 'Enter') btnsEl.querySelector('.btn-primary')?.click();
                if (e.key === 'Escape') btnsEl.querySelector('.btn-secondary')?.click();
            });
        } else {
            btnsEl.querySelector('.btn-primary')?.focus();
            overlay.addEventListener('keydown', e => {
                if (e.key === 'Escape') btnsEl.querySelector('.btn-secondary, .btn-primary')?.click();
            });
        }
    });
}

function showAlert(message, title) {
    return _buildDialog({
        title,
        message,
        buttons: [{ label: 'אישור', value: true, primary: true }]
    });
}

function showConfirm(message, title, okLabel = 'אישור', cancelLabel = 'ביטול') {
    return _buildDialog({
        title,
        message,
        buttons: [
            { label: cancelLabel, value: false, primary: false },
            { label: okLabel,     value: true,  primary: true  }
        ]
    });
}

function showPrompt(message, defaultValue = '', title) {
    return _buildDialog({
        title,
        message,
        inputDefault: defaultValue,
        buttons: [
            { label: 'ביטול', value: null,  primary: false },
            { label: 'אישור', value: true,  primary: true  }
        ]
    });
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
    initNextTaskId();
    setupEventListeners();
    loadProjects();
    restoreCurrentProject();
});

function initNextTaskId() {
    const all = getAllTasks();
    if (all.length > 0) {
        nextTaskId = Math.max(...all.map(t => t.id || 0)) + 1;
    }
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
}

function getColumns() {
    const d = localStorage.getItem(DB.columns);
    if (!d) {
        saveColumns(DEFAULT_COLUMNS);
        return DEFAULT_COLUMNS.slice();
    }
    try {
        const cols = JSON.parse(d);
        if (Array.isArray(cols) && cols.length > 0) return cols;
    } catch (e) {}
    saveColumns(DEFAULT_COLUMNS);
    return DEFAULT_COLUMNS.slice();
}

function saveColumns(columns) {
    localStorage.setItem(DB.columns, JSON.stringify(columns));
    createBackup();
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
    const id = 'col_' + Date.now();
    columns.push({ id, name: safeName, hue: (columns.length * 47) % 360 });
    saveColumns(columns);
    renderKanban();
}

async function deleteColumn(id) {
    const columns = getColumns();
    const col = columns.find(c => c.id === id);
    if (!col) return;
    const tasksInColumn = getAllTasks().filter(t => t.state === id).length;
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

function getCurrentProjectId() {
    const saved = localStorage.getItem(DB.currentProject);
    return saved ? parseInt(saved) : null;
}

function setCurrentProjectId(id) {
    if (id) localStorage.setItem(DB.currentProject, id.toString());
    else localStorage.removeItem(DB.currentProject);
}

// ===== Projects =====
async function addProject(name) {
    name = name.trim();
    if (!name) return;

    const projects = getProjects();
    const escapedName = escapeHtml(name);
    if (projects.find(p => p.name === escapedName)) {
        await showAlert('פרויקט עם שם זה כבר קיים');
        return;
    }

    const project = {
        id: Date.now(),
        name: escapeHtml(name),
        hueIdx: projects.length % HUES.length,
        createdAt: new Date().toISOString()
    };

    projects.push(project);
    saveProjects(projects);
    loadProjects();
    document.getElementById('newProjectInput').value = '';

    // Auto-select first project
    if (!currentProjectId) {
        selectProject(project.id);
    }
}

async function deleteProject(id, event) {
    if (event) event.stopPropagation();
    const ok = await showConfirm('למחוק את הפרויקט וכל המשימות שלו?', 'מחיקת פרויקט', 'מחק', 'ביטול');
    if (!ok) return;

    const projects = getProjects().filter(p => p.id !== id);
    const tasks = getAllTasks().filter(t => t.projectId !== id);

    localStorage.setItem(DB.projects, JSON.stringify(projects));
    localStorage.setItem(DB.tasks, JSON.stringify(tasks));
    createBackup();

    if (currentProjectId === id) {
        currentProjectId = null;
        setCurrentProjectId(null);
    }

    loadProjects();
    updateUI();
}

function selectProject(id) {
    currentProjectId = id;
    setCurrentProjectId(id);
    loadProjects();
    updateUI();
}

function restoreCurrentProject() {
    const savedId = getCurrentProjectId();
    if (savedId) {
        const projects = getProjects();
        if (projects.find(p => p.id === savedId)) {
            selectProject(savedId);
            return;
        }
    }
    currentProjectId = null;
    updateUI();
}

function loadProjects() {
    const list = document.getElementById('projectsList');
    const projects = getProjects();
    document.getElementById('projectCount').textContent = projects.length;

    list.innerHTML = '';

    if (projects.length === 0) {
        list.innerHTML = '<div style="padding: 16px 12px; text-align: center; color: var(--ink-f); font-size: 12px;">אין פרויקטים עדיין</div>';
        return;
    }

    const cols = getColumns();
    const lastColId = cols.length ? cols[cols.length - 1].id : null;
    projects.forEach((p) => {
        const taskCount = getTasks(p.id).filter(t => t.state !== lastColId).length;
        const isActive = p.id === currentProjectId;
        const hue = HUES[p.hueIdx || 0];

        const el = document.createElement('div');
        el.className = `project-item ${isActive ? 'active' : ''}`;
        el.style.setProperty('--hue', hue);
        el.onclick = () => selectProject(p.id);
        el.innerHTML = `
            <span class="project-dot"></span>
            <span class="project-name">${p.name}</span>
            <span class="project-count">${taskCount}</span>
            <button class="project-delete-btn" onclick="deleteProject(${p.id}, event)" title="מחק">×</button>
        `;
        list.appendChild(el);
    });
}

// ===== Tasks =====
async function addTask(data) {
    if (!currentProjectId) {
        await showAlert('בחר פרויקט תחילה');
        return;
    }
    if (!data.title || !data.title.trim()) {
        await showAlert('כותרת חובה');
        return;
    }

    const task = {
        id: nextTaskId++,
        projectId: currentProjectId,
        title: escapeHtml(data.title.trim()),
        description: escapeHtml((data.description || '').trim()),
        state: data.state || 'todo',
        priority: data.priority || 'med',
        tag: escapeHtml((data.tag || '').trim()),
        assignee: escapeHtml((data.assignee || '').trim()),
        due: escapeHtml((data.due || '').trim()),
        dueIn: data.dueIn !== undefined ? data.dueIn : null,
        comments: 0,
        attachments: 0,
        createdAt: new Date().toISOString()
    };

    const tasks = getAllTasks();
    tasks.push(task);
    saveTasks(tasks);
    loadProjects();
    rerenderCurrentView();
}

function updateTask(id, data) {
    const tasks = getAllTasks();
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    if (data.title !== undefined) task.title = escapeHtml(data.title.trim());
    if (data.description !== undefined) task.description = escapeHtml(data.description.trim());
    if (data.state !== undefined) task.state = data.state;
    if (data.priority !== undefined) task.priority = data.priority;
    if (data.tag !== undefined) task.tag = escapeHtml(data.tag.trim());
    if (data.assignee !== undefined) task.assignee = escapeHtml(data.assignee.trim());
    if (data.due !== undefined) {
        task.due = escapeHtml(data.due.trim());
        task.dueIn = data.dueIn !== undefined ? data.dueIn : null;
    }
    saveTasks(tasks);
    loadProjects();
    rerenderCurrentView();
}

async function deleteTask(id, event) {
    if (event) event.stopPropagation();
    const ok = await showConfirm('למחוק את המשימה?', 'מחיקת משימה', 'מחק', 'ביטול');
    if (!ok) return;

    const tasks = getAllTasks().filter(t => t.id !== id);
    saveTasks(tasks);
    loadProjects();
    rerenderCurrentView();
}

function moveTask(id, newState) {
    updateTask(id, { state: newState });
}

// ===== Kanban Rendering =====
function renderKanban() {
    const board = document.getElementById('kanbanBoard');
    if (!board) return;

    const columns = getColumns();
    board.innerHTML = '';
    board.style.gridTemplateColumns = `repeat(${columns.length}, minmax(260px, 1fr)) auto`;

    const tasks = currentProjectId ? applyFiltersAndSort(getTasks(currentProjectId)) : [];

    columns.forEach(col => {
        const colEl = document.createElement('div');
        colEl.className = 'kanban-column';
        colEl.dataset.state = col.id;
        colEl.style.setProperty('--col-hue', col.hue);

        const colTasks = tasks.filter(t => t.state === col.id);

        colEl.innerHTML = `
            <div class="column-header">
                <span class="column-dot"></span>
                <span class="column-title" title="לחץ פעמיים לשינוי שם">${col.name}</span>
                <span class="column-count">${colTasks.length}</span>
                <button class="column-add-btn" type="button" aria-label="הוסף משימה לעמודה" data-col-add="${col.id}">+</button>
                <button class="column-delete-btn" type="button" aria-label="מחק עמודה" data-col-del="${col.id}" title="מחק עמודה">×</button>
            </div>
            <div class="column-body" id="column-${col.id}"></div>
        `;

        board.appendChild(colEl);

        const body = colEl.querySelector('.column-body');
        if (colTasks.length === 0) {
            body.innerHTML = '<div class="column-empty">גרור משימה לכאן</div>';
        } else {
            colTasks.forEach(task => body.appendChild(buildCard(task)));
        }

        // Inline rename via dblclick
        const titleEl = colEl.querySelector('.column-title');
        titleEl.addEventListener('dblclick', async () => {
            const current = unescapeForInput(col.name);
            const next = await showPrompt('שם חדש לעמודה:', current);
            if (next !== null && next.trim()) renameColumn(col.id, next);
        });
    });

    // Add-column button at the end of the board
    const addColBtn = document.createElement('button');
    addColBtn.type = 'button';
    addColBtn.className = 'add-column-btn';
    addColBtn.setAttribute('aria-label', 'הוסף עמודה חדשה');
    addColBtn.innerHTML = '<span>+ עמודה חדשה</span>';
    addColBtn.addEventListener('click', async () => {
        const name = await showPrompt('שם העמודה החדשה:');
        if (name && name.trim()) addColumn(name);
    });
    board.appendChild(addColBtn);

    // Wire per-column add/delete buttons
    board.querySelectorAll('[data-col-add]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            openEditModal(null, btn.dataset.colAdd);
        });
    });
    board.querySelectorAll('[data-col-del]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteColumn(btn.dataset.colDel);
        });
    });

    setupColumnDragDrop();

    // Update subtitle
    if (currentProjectId) {
        const total = tasks.length;
        const lastColId = columns[columns.length - 1].id;
        const done = tasks.filter(t => t.state === lastColId).length;
        document.getElementById('pageSubtitle').textContent =
            `${total} משימות · ${done} בעמודה האחרונה`;
    }
}

function buildCard(task) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.state = task.state;
    card.dataset.id = task.id;
    card.draggable = true;
    const colHue = (getColumns().find(c => c.id === task.state) || {}).hue;
    if (colHue !== undefined) card.style.setProperty('--col-hue', colHue);
    const isLastCol = (() => {
        const cols = getColumns();
        return cols.length > 0 && cols[cols.length - 1].id === task.state;
    })();

    card.addEventListener('dragstart', (e) => {
        draggingTaskId = task.id;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    });

    card.addEventListener('dragend', () => {
        draggingTaskId = null;
        card.classList.remove('dragging');
    });

    card.addEventListener('click', (e) => {
        if (e.target.closest('.card-action-btn')) return;
        openEditModal(task.id);
    });

    const priorityLabel = { high: 'גבוה', med: 'בינוני', low: 'נמוך' }[task.priority] || 'בינוני';
    const tagClass = KNOWN_TAGS.includes(task.tag) ? `tag-${task.tag}` : 'tag-default';
    const overdueSoon = task.dueIn !== null && task.dueIn !== undefined && task.dueIn <= 7;
    const idStr = String(task.id).padStart(4, '0');

    card.innerHTML = `
        <span class="card-stripe"></span>
        <div class="card-actions">
            <button class="card-action-btn" onclick="openEditModal(${task.id})" title="ערוך">✎</button>
            <button class="card-action-btn delete" onclick="deleteTask(${task.id}, event)" title="מחק">×</button>
        </div>
        <div class="card-top">
            ${task.tag ? `<span class="tag ${tagClass}">${task.tag}</span>` : '<span></span>'}
            <span class="card-id">#${idStr}</span>
        </div>
        <div class="card-title ${isLastCol ? 'done' : ''}">${task.title}</div>
        ${task.description ? `<div class="card-description">${task.description}</div>` : ''}
        <div class="card-meta">
            <span class="priority priority-${task.priority || 'med'}">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 21V4"/><path d="M4 4h12l-2 5 2 5H4"/>
                </svg>
                ${priorityLabel}
            </span>
            ${task.due ? `
                <span class="due-chip ${overdueSoon ? 'overdue' : ''}">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M8 2v4"/><path d="M16 2v4"/><path d="M3 9h18"/>
                        <rect x="3" y="4" width="18" height="18" rx="2"/>
                    </svg>
                    ${task.due}
                </span>
            ` : ''}
            <div class="card-trailing">
                ${task.assignee ? `<div class="avatar avatar-sm" style="--hue: ${nameHue(task.assignee)};" title="${task.assignee}">${initials(task.assignee)}</div>` : ''}
            </div>
        </div>
    `;

    return card;
}

// ===== Drag & Drop on columns =====
function setupColumnDragDrop() {
    document.querySelectorAll('.kanban-column').forEach(col => {
        col.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            col.classList.add('drop-over');
        });

        col.addEventListener('dragleave', (e) => {
            if (!col.contains(e.relatedTarget)) {
                col.classList.remove('drop-over');
            }
        });

        col.addEventListener('drop', (e) => {
            e.preventDefault();
            col.classList.remove('drop-over');
            if (draggingTaskId !== null) {
                const newState = col.dataset.state;
                moveTask(draggingTaskId, newState);
            }
        });
    });
}

// ===== UI Update =====
function updateUI() {
    const board = document.getElementById('kanbanBoard');
    const list = document.getElementById('listView');
    const empty = document.getElementById('emptyState');
    const title = document.getElementById('pageTitle');
    const breadcrumb = document.getElementById('currentProjectName');
    const subtitle = document.getElementById('pageSubtitle');

    if (currentProjectId) {
        const project = getProjects().find(p => p.id === currentProjectId);
        if (project) {
            title.textContent = project.name;
            breadcrumb.textContent = project.name;
            empty.style.display = 'none';
            if (currentView === 'list') {
                board.style.display = 'none';
                setView('list');
            } else {
                if (list) list.style.display = 'none';
                board.style.display = 'grid';
                renderKanban();
            }
            return;
        }
    }
    // No project selected — still show list if in list view (can show all projects)
    if (currentView === 'list') {
        title.textContent = 'כל המשימות';
        breadcrumb.textContent = 'Workspace';
        subtitle.textContent = '';
        board.style.display = 'none';
        empty.style.display = 'none';
        setView('list');
        return;
    }
    title.textContent = 'בחר פרויקט';
    breadcrumb.textContent = 'Workspace';
    subtitle.textContent = 'כדי להתחיל, בחר או צור פרויקט';
    board.style.display = 'none';
    if (list) list.style.display = 'none';
    empty.style.display = 'flex';
}

// ===== Modal =====
async function openEditModal(taskId, defaultColumnId) {
    if (!currentProjectId) {
        await showAlert('בחר פרויקט תחילה');
        return;
    }

    editingTaskId = taskId;
    const task = taskId ? getAllTasks().find(t => t.id === taskId) : null;
    const isNew = !task;

    const modal = buildModal(task, isNew, defaultColumnId);
    document.body.appendChild(modal);

    setTimeout(() => {
        const titleInput = modal.querySelector('#modalTitle');
        if (titleInput) titleInput.focus();
    }, 50);
}

function buildModal(task, isNew, defaultColumnId) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'taskModal';

    const columns = getColumns();
    const fallbackState = defaultColumnId || (columns[0] && columns[0].id) || 'todo';
    const t = task || { title: '', description: '', state: fallbackState, priority: 'med', tag: '', assignee: '', due: '', dueIn: null };

    const stateOptions = columns.map(c =>
        `<option value="${c.id}" ${t.state === c.id ? 'selected' : ''}>${c.name}</option>`
    ).join('');

    overlay.innerHTML = `
        <div class="modal" onclick="event.stopPropagation()">
            <div class="modal-header">
                <h2 class="modal-title">${isNew ? 'משימה חדשה' : 'עריכת משימה'}</h2>
                <button class="modal-close" type="button" aria-label="סגור" onclick="closeModal()">×</button>
            </div>
            <div class="modal-body">
                <div class="field">
                    <label class="field-label">כותרת *</label>
                    <input type="text" id="modalTitle" class="field-input" value="${unescapeForInput(t.title)}" placeholder="מה צריך לעשות?">
                </div>
                <div class="field">
                    <label class="field-label">תיאור</label>
                    <textarea id="modalDescription" class="field-textarea" placeholder="פרטים נוספים...">${unescapeForInput(t.description)}</textarea>
                </div>
                <div class="field-row">
                    <div class="field">
                        <label class="field-label">מצב</label>
                        <select id="modalState" class="field-select">
                            ${stateOptions}
                        </select>
                    </div>
                    <div class="field">
                        <label class="field-label">תעדוף</label>
                        <select id="modalPriority" class="field-select">
                            <option value="high" ${t.priority === 'high' ? 'selected' : ''}>גבוה</option>
                            <option value="med" ${t.priority === 'med' ? 'selected' : ''}>בינוני</option>
                            <option value="low" ${t.priority === 'low' ? 'selected' : ''}>נמוך</option>
                        </select>
                    </div>
                </div>
                <div class="field-row">
                    <div class="field">
                        <label class="field-label">תגית</label>
                        <input type="text" id="modalTag" class="field-input" value="${unescapeForInput(t.tag)}" placeholder="מסמכים, פגישה...">
                    </div>
                    <div class="field">
                        <label class="field-label">אחראי</label>
                        <input type="text" id="modalAssignee" class="field-input" value="${unescapeForInput(t.assignee)}" placeholder="שם מלא">
                    </div>
                </div>
                <div class="field">
                    <label class="field-label">תאריך יעד</label>
                    <input type="date" id="modalDueDate" class="field-input" value="${parseDueDate(t.due)}">
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeModal()">ביטול</button>
                <button class="btn-primary" onclick="saveTaskFromModal(${isNew ? 'null' : t.id})">${isNew ? 'צור משימה' : 'שמור'}</button>
            </div>
        </div>
    `;

    overlay.onclick = () => closeModal();

    return overlay;
}

function parseDueDate(formatted) {
    // If we stored ISO date, return it; otherwise empty
    if (!formatted) return '';
    if (/^\d{4}-\d{2}-\d{2}/.test(formatted)) return formatted.substring(0, 10);
    return '';
}

function formatDueDate(isoDate) {
    if (!isoDate) return { display: '', dueIn: null };
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return { display: '', dueIn: null };

    const months = ['בינואר', 'בפברואר', 'במרץ', 'באפריל', 'במאי', 'ביוני',
                    'ביולי', 'באוגוסט', 'בספטמבר', 'באוקטובר', 'בנובמבר', 'בדצמבר'];
    const display = `${date.getDate()} ${months[date.getMonth()]}`;

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const dueIn = Math.floor((date - now) / (1000 * 60 * 60 * 24));

    return { display: `${display}|${isoDate}`, dueIn };
}

async function saveTaskFromModal(taskId) {
    const title = document.getElementById('modalTitle').value;
    if (!title.trim()) {
        await showAlert('כותרת חובה');
        return;
    }

    const isoDate = document.getElementById('modalDueDate').value;
    const dueInfo = formatDueDate(isoDate);
    // Store ISO date as the "due" so we can re-edit; display via formatter
    const dueDisplay = isoDate ? formatDueDate(isoDate).display.split('|')[0] : '';

    const data = {
        title: title,
        description: document.getElementById('modalDescription').value,
        state: document.getElementById('modalState').value,
        priority: document.getElementById('modalPriority').value,
        tag: document.getElementById('modalTag').value,
        assignee: document.getElementById('modalAssignee').value,
        due: isoDate ? dueDisplay : '',
        dueIn: dueInfo.dueIn
    };

    if (taskId === null || taskId === undefined) {
        addTask(data);
    } else {
        updateTask(taskId, data);
    }

    closeModal();
}

function closeModal() {
    const m = document.getElementById('taskModal');
    if (m) m.remove();
    editingTaskId = null;
}

// ===== Search =====
function setupSearch() {
    const input = document.getElementById('searchInput');
    input.addEventListener('input', () => {
        const term = input.value.toLowerCase().trim();
        document.querySelectorAll('.card').forEach(card => {
            const title = card.querySelector('.card-title')?.textContent.toLowerCase() || '';
            const desc = card.querySelector('.card-description')?.textContent.toLowerCase() || '';
            const match = !term || title.includes(term) || desc.includes(term);
            card.style.display = match ? '' : 'none';
        });
    });
}

// ===== View Toggle =====
function setView(view) {
    currentView = view;
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.view === view);
    });
    const board = document.getElementById('kanbanBoard');
    let list = document.getElementById('listView');
    if (view === 'list') {
        board.style.display = 'none';
        if (!list) {
            list = document.createElement('div');
            list.id = 'listView';
            list.className = 'list-view';
            board.parentNode.insertBefore(list, board.nextSibling);
        }
        list.style.display = 'block';
        renderList();
    } else {
        if (list) list.style.display = 'none';
        if (currentProjectId) {
            board.style.display = 'grid';
            renderKanban();
        }
    }
}

function setListScope(scope) {
    listScope = scope;
    document.querySelectorAll('.list-scope-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.scope === scope);
    });
    renderList();
}

function renderList() {
    const list = document.getElementById('listView');
    if (!list) return;

    const isAll = listScope === 'all';
    const projects = getProjects();
    const projectMap = Object.fromEntries(projects.map(p => [p.id, p.name]));

    const rawTasks = isAll ? applyFiltersAndSort(getAllTasks()) : (currentProjectId ? applyFiltersAndSort(getTasks(currentProjectId)) : []);

    const columns = getColumns();
    const stateLabel = (id) => (columns.find(x => x.id === id) || {}).name || id;
    const stateHue  = (id) => (columns.find(x => x.id === id) || {}).hue  || 220;
    const lastColId = columns.length ? columns[columns.length - 1].id : null;
    const priLabels = { high: 'גבוה', med: 'בינוני', low: 'נמוך' };

    list.innerHTML = `
        <div class="list-toolbar">
            <div class="list-scope-toggle">
                <button class="list-scope-btn ${listScope === 'current' ? 'active' : ''}" data-scope="current" onclick="setListScope('current')" type="button">פרויקט נוכחי</button>
                <button class="list-scope-btn ${listScope === 'all' ? 'active' : ''}" data-scope="all" onclick="setListScope('all')" type="button">כל הפרויקטים</button>
            </div>
            <span class="list-count">${rawTasks.length} משימות</span>
        </div>
        ${rawTasks.length === 0
            ? '<div class="list-empty">אין משימות להצגה</div>'
            : `<table class="list-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>כותרת</th>
                    ${isAll ? '<th>פרויקט</th>' : ''}
                    <th>מצב</th>
                    <th>תעדוף</th>
                    <th>תגית</th>
                    <th>אחראי</th>
                    <th>תאריך יעד</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                ${rawTasks.map(t => `
                    <tr data-id="${t.id}" class="list-row ${t.state === lastColId ? 'done' : ''}">
                        <td class="list-id">#${String(t.id).padStart(4, '0')}</td>
                        <td class="list-title">${t.title}</td>
                        ${isAll ? `<td class="list-project">${projectMap[t.projectId] || '—'}</td>` : ''}
                        <td><span class="state-pill" style="--col-hue: ${stateHue(t.state)};">${stateLabel(t.state)}</span></td>
                        <td><span class="priority priority-${t.priority || 'med'}">${priLabels[t.priority] || 'בינוני'}</span></td>
                        <td>${t.tag ? `<span class="tag tag-${KNOWN_TAGS.includes(t.tag) ? t.tag : 'default'}">${t.tag}</span>` : ''}</td>
                        <td>${t.assignee ? `<span class="list-assignee">${t.assignee}</span>` : ''}</td>
                        <td>${t.due || ''}</td>
                        <td>
                            <button class="card-action-btn" type="button" aria-label="ערוך" onclick="openEditModal(${t.id})">✎</button>
                            <button class="card-action-btn delete" type="button" aria-label="מחק" onclick="deleteTask(${t.id}, event)">×</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>`}
    `;
}

// ===== Filter + Sort =====
function applyFiltersAndSort(tasks) {
    let out = tasks.slice();

    if (activeFilters.priority) out = out.filter(t => t.priority === activeFilters.priority);
    if (activeFilters.tag) out = out.filter(t => t.tag === activeFilters.tag);
    if (activeFilters.assignee) out = out.filter(t => t.assignee === activeFilters.assignee);

    const priOrder = { high: 0, med: 1, low: 2 };
    out.sort((a, b) => {
        switch (activeSort) {
            case 'created-asc': return new Date(a.createdAt) - new Date(b.createdAt);
            case 'created-desc': return new Date(b.createdAt) - new Date(a.createdAt);
            case 'priority': return (priOrder[a.priority] ?? 1) - (priOrder[b.priority] ?? 1);
            case 'title': return a.title.localeCompare(b.title, 'he');
            case 'due': {
                if (!a.due && !b.due) return 0;
                if (!a.due) return 1;
                if (!b.due) return -1;
                return (a.dueIn ?? 9999) - (b.dueIn ?? 9999);
            }
            default: return 0;
        }
    });
    return out;
}

function openFilterMenu(anchor) {
    closePopovers();
    const tasks = currentProjectId ? getTasks(currentProjectId) : [];
    const tags = [...new Set(tasks.map(t => t.tag).filter(Boolean))];
    const assignees = [...new Set(tasks.map(t => t.assignee).filter(Boolean))];

    const pop = document.createElement('div');
    pop.className = 'popover';
    pop.id = 'activePopover';
    pop.innerHTML = `
        <div class="popover-title">סינון</div>
        <div class="popover-section">
            <div class="popover-label">תעדוף</div>
            <div class="popover-row">
                ${['high', 'med', 'low'].map(p => `
                    <button class="popover-chip ${activeFilters.priority === p ? 'active' : ''}" type="button" onclick="setFilter('priority', '${p}')">
                        ${p === 'high' ? 'גבוה' : p === 'med' ? 'בינוני' : 'נמוך'}
                    </button>
                `).join('')}
            </div>
        </div>
        ${tags.length ? `
            <div class="popover-section">
                <div class="popover-label">תגית</div>
                <div class="popover-row">
                    ${tags.map(tag => `<button class="popover-chip ${activeFilters.tag === tag ? 'active' : ''}" type="button" onclick="setFilter('tag', '${escapeAttr(tag)}')">${tag}</button>`).join('')}
                </div>
            </div>
        ` : ''}
        ${assignees.length ? `
            <div class="popover-section">
                <div class="popover-label">אחראי</div>
                <div class="popover-row">
                    ${assignees.map(a => `<button class="popover-chip ${activeFilters.assignee === a ? 'active' : ''}" type="button" onclick="setFilter('assignee', '${escapeAttr(a)}')">${a}</button>`).join('')}
                </div>
            </div>
        ` : ''}
        <div class="popover-footer">
            <button class="btn-secondary" type="button" onclick="clearFilters()">נקה הכל</button>
            <button class="btn-primary" type="button" onclick="closePopovers()">סגור</button>
        </div>
    `;
    positionPopover(pop, anchor);
    document.body.appendChild(pop);
}

function openSortMenu(anchor) {
    closePopovers();
    const opts = [
        ['created-desc', 'הכי חדש קודם'],
        ['created-asc', 'הכי ישן קודם'],
        ['priority', 'לפי תעדוף'],
        ['title', 'לפי כותרת (א-ת)'],
        ['due', 'לפי תאריך יעד']
    ];
    const pop = document.createElement('div');
    pop.className = 'popover';
    pop.id = 'activePopover';
    pop.innerHTML = `
        <div class="popover-title">מיון</div>
        <div class="popover-menu">
            ${opts.map(([k, label]) => `
                <button class="popover-menu-item ${activeSort === k ? 'active' : ''}" type="button" onclick="setSort('${k}')">
                    ${label}
                </button>
            `).join('')}
        </div>
    `;
    positionPopover(pop, anchor);
    document.body.appendChild(pop);
}

function positionPopover(pop, anchor) {
    const rect = anchor.getBoundingClientRect();
    const MIN_W = 220; // matches CSS min-width
    pop.style.position = 'fixed';
    pop.style.top = (rect.bottom + 4) + 'px';
    pop.style.zIndex = '500';
    // If aligning right-edge-to-right-edge would push the popover off the left side,
    // align the left edge of the popover with the left edge of the anchor instead.
    if (rect.right - MIN_W < 8) {
        pop.style.left = Math.max(8, rect.left) + 'px';
        pop.style.right = 'auto';
    } else {
        pop.style.right = (window.innerWidth - rect.right) + 'px';
        pop.style.left = 'auto';
    }
}

function closePopovers() {
    const p = document.getElementById('activePopover');
    if (p) p.remove();
}

function setFilter(type, value) {
    activeFilters[type] = activeFilters[type] === value ? null : value;
    rerenderCurrentView();
    closePopovers();
    updateFilterBadge();
}

function clearFilters() {
    activeFilters = { priority: null, tag: null, assignee: null };
    rerenderCurrentView();
    closePopovers();
    updateFilterBadge();
}

function setSort(sort) {
    activeSort = sort;
    rerenderCurrentView();
    closePopovers();
}

function updateFilterBadge() {
    const active = Object.values(activeFilters).filter(Boolean).length;
    const btn = document.querySelector('.header-btn-filter');
    if (btn) {
        const existing = btn.querySelector('.filter-badge');
        if (existing) existing.remove();
        if (active > 0) {
            const badge = document.createElement('span');
            badge.className = 'filter-badge';
            badge.textContent = active;
            btn.appendChild(badge);
        }
    }
}

function rerenderCurrentView() {
    if (currentView === 'kanban') renderKanban();
    else renderList();
}

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
            ? '<div class="popover-empty">אין התראות חדשות 🎉</div>'
            : `<div class="popover-menu">${overdue.map(t => {
                const proj = getProjects().find(p => p.id === t.projectId);
                const urgency = t.dueIn < 0 ? 'באיחור!' : t.dueIn === 0 ? 'היום' : `בעוד ${t.dueIn} ימים`;
                return `
                    <div class="popover-notif" onclick="jumpToTask(${t.projectId}, ${t.id})">
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
    pop.innerHTML = `
        <div class="popover-title">הגדרות</div>
        <div class="popover-menu">
            <button class="popover-menu-item" type="button" onclick="exportData()">📥 ייצא JSON</button>
            <button class="popover-menu-item" type="button" onclick="document.getElementById('importFile').click()">📤 ייבא JSON</button>
            <button class="popover-menu-item" type="button" onclick="showBackupInfo()">💾 פרטי גיבוי</button>
            <button class="popover-menu-item danger" type="button" onclick="clearAllData()">🗑️ נקה את כל הנתונים</button>
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

    const pop = document.createElement('div');
    pop.className = 'popover';
    pop.id = 'activePopover';
    pop.innerHTML = `
        <div class="popover-title">הפרופיל שלי</div>
        <div class="popover-stats">
            <div class="stat"><div class="stat-num">${projects}</div><div class="stat-label">פרויקטים</div></div>
            <div class="stat"><div class="stat-num">${tasks}</div><div class="stat-label">משימות</div></div>
            <div class="stat"><div class="stat-num">${done}</div><div class="stat-label">הושלמו</div></div>
        </div>
        <div class="popover-menu">
            <button class="popover-menu-item" type="button" onclick="exportData()">📥 ייצא נתונים</button>
            <button class="popover-menu-item" type="button" onclick="showBackupInfo()">💾 פרטי גיבוי</button>
        </div>
    `;
    positionPopover(pop, anchor);
    document.body.appendChild(pop);
}

// ===== Settings actions =====
function exportData() {
    closePopovers();
    const data = {
        projects: getProjects(),
        tasks: getAllTasks(),
        exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `taskboard-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importData(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!Array.isArray(data.projects) || !Array.isArray(data.tasks)) {
                await showAlert('קובץ לא תקין');
                return;
            }
            const ok = await showConfirm(
                `לייבא ${data.projects.length} פרויקטים ו-${data.tasks.length} משימות?\nזה יחליף את הנתונים הקיימים.`,
                'ייבוא נתונים', 'ייבא', 'ביטול'
            );
            if (!ok) return;
            localStorage.setItem(DB.projects, JSON.stringify(data.projects));
            localStorage.setItem(DB.tasks, JSON.stringify(data.tasks));
            createBackup();
            location.reload();
        } catch (err) {
            await showAlert('שגיאה בקריאת הקובץ: ' + err.message);
        }
    };
    reader.readAsText(file);
}

async function showBackupInfo() {
    closePopovers();
    const b = localStorage.getItem(DB.backup);
    if (!b) {
        await showAlert('אין גיבוי זמין');
        return;
    }
    const backup = JSON.parse(b);
    await showAlert(
        `גיבוי אחרון: ${new Date(backup.timestamp).toLocaleString('he-IL')}\n${backup.projects.length} פרויקטים, ${backup.tasks.length} משימות`,
        'פרטי גיבוי'
    );
}

async function clearAllData() {
    closePopovers();
    const ok1 = await showConfirm('⚠️ זה ימחק את כל הפרויקטים והמשימות!\n\nהאם אתה בטוח?', 'מחיקת כל הנתונים', 'מחק הכל', 'ביטול');
    if (!ok1) return;
    const ok2 = await showConfirm('אישור אחרון — אין דרך חזרה!', 'אישור סופי', 'מחק', 'ביטול');
    if (!ok2) return;
    [DB.projects, DB.tasks, DB.backup, DB.currentProject].forEach(k => localStorage.removeItem(k));
    location.reload();
}

// ===== Event Listeners =====
function setupEventListeners() {
    // New project
    document.getElementById('newProjectInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addProject(e.target.value);
    });
    document.querySelector('.sidebar-add-btn').addEventListener('click', () => {
        addProject(document.getElementById('newProjectInput').value);
    });

    // Add task
    document.querySelector('.add-task-btn').addEventListener('click', () => openEditModal(null));

    // View tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => setView(btn.dataset.view));
    });

    // Filter + Sort
    const filterBtn = document.querySelector('.header-btn-filter');
    const sortBtn = document.querySelector('.header-btn-sort');
    if (filterBtn) filterBtn.addEventListener('click', (e) => { e.stopPropagation(); openFilterMenu(filterBtn); });
    if (sortBtn) sortBtn.addEventListener('click', (e) => { e.stopPropagation(); openSortMenu(sortBtn); });

    // Topbar icons
    const bellBtn = document.querySelector('.topbar-icon-btn[aria-label="התראות"]');
    const settingsBtn = document.querySelector('.topbar-icon-btn[aria-label="הגדרות"]');
    if (bellBtn) bellBtn.addEventListener('click', (e) => { e.stopPropagation(); openNotificationsMenu(bellBtn); });
    if (settingsBtn) settingsBtn.addEventListener('click', (e) => { e.stopPropagation(); openSettingsMenu(settingsBtn); });

    // Import file input
    const importInput = document.getElementById('importFile');
    if (importInput) importInput.addEventListener('change', (e) => importData(e.target.files[0]));

    // Close popovers on outside click
    document.addEventListener('click', (e) => {
        const pop = document.getElementById('activePopover');
        if (pop && !pop.contains(e.target)) closePopovers();
    });

    // Escape key to close modal / popover
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const m = document.getElementById('taskModal');
            if (m) { closeModal(); return; }
            closePopovers();
        }
    });

    setupSearch();
}

// ===== Utilities =====
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

function unescapeForInput(text) {
    if (!text) return '';
    return String(text)
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'");
}

function nameHue(name) {
    let h = 0;
    for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return h % 360;
}

function initials(name) {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    return (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
}

function escapeAttr(text) {
    if (!text) return '';
    return String(text).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// Expose globally for inline handlers
window.deleteProject = deleteProject;
window.deleteTask = deleteTask;
window.openEditModal = openEditModal;
window.saveTaskFromModal = saveTaskFromModal;
window.closeModal = closeModal;
window.setFilter = setFilter;
window.setSort = setSort;
window.clearFilters = clearFilters;
window.closePopovers = closePopovers;
window.exportData = exportData;
window.showBackupInfo = showBackupInfo;
window.clearAllData = clearAllData;
window.jumpToTask = jumpToTask;
window.setListScope = setListScope;
