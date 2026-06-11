// ===== Storage Keys =====
const DB = {
    projects: 'tb_projects',
    tasks: 'tb_tasks',
    backup: 'tb_backup',
    currentProject: 'tb_currentProject',
    columns: 'tb_columns',
    taskTypes: 'tb_task_types'
};

const DEFAULT_USER = { name: 'דנה גולן', role: 'מנהל פרויקטים', hue: 200 };

let currentProjectId = null;
let editingTaskId = null;
let draggingTaskId = null;
let draggingColumnId = null;
let nextTaskId = 1000;
let currentView = 'kanban'; // 'kanban' | 'list'
let listScope = 'current'; // 'current' | 'all'
let activeFilters = { priority: null, tag: null, assignee: null };
let activeSort = 'created-desc'; // 'created-desc' | 'created-asc' | 'priority' | 'title' | 'due'
let searchPageTerm = null;
let searchPageFilters = { projectId: null, priority: null, state: null };

// Hue palette for project dots
const HUES = [230, 160, 40, 290, 0, 60, 120, 180, 260, 320];

// Tag colors known (Hebrew)
const KNOWN_TAGS = ['מסמכים', 'פגישה', 'פנימי', 'bug', 'feature'];

// Preset hues for color picker
const PRESET_HUES = [0, 25, 50, 100, 140, 175, 210, 250, 275, 320];

// Default kanban columns
const DEFAULT_COLUMNS = [
    { id: 'todo',    name: 'To Do',    hue: 220 },
    { id: 'doing',   name: 'Active',   hue: 210 },
    { id: 'testing', name: 'בבדיקות',  hue: 35  },
    { id: 'done',    name: 'Closed',   hue: 145 }
];

const DEFAULT_TASK_TYPES = [
    { id: 'bug',      name: 'Bug',      hue: 0   },
    { id: 'feature',  name: 'Feature',  hue: 220 },
    { id: 'task',     name: 'Task',     hue: 210 },
    { id: 'refactor', name: 'Refactor', hue: 280 },
    { id: 'docs',     name: 'Docs',     hue: 160 },
];

const ICONS = {
    pencil: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    export: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    import: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
    save:   `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
    tag:    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
    trash:  `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
    check:  `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
};

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
    renderUserUI();
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
    const id = 'col_' + Date.now();
    columns.push({ id, name: safeName, hue: (columns.length * 47) % 360 });
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

function getUser() {
    const d = localStorage.getItem(DB.user);
    if (!d) return { ...DEFAULT_USER };
    try {
        const u = JSON.parse(d);
        return {
            name: u.name || DEFAULT_USER.name,
            role: u.role || DEFAULT_USER.role,
            hue: (u.hue !== undefined && u.hue !== null) ? u.hue : DEFAULT_USER.hue
        };
    } catch (e) {
        return { ...DEFAULT_USER };
    }
}

function saveUser(user) {
    localStorage.setItem(DB.user, JSON.stringify(user));
    createBackup();
    renderUserUI();
}

function renderUserUI() {
    const u = getUser();
    const ini = initials(u.name) || u.name.substring(0, 2);

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

function openUserProfileModal() {
    closePopovers();
    const u = getUser();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'taskModal';
    overlay.innerHTML = `
        <div class="modal" onclick="event.stopPropagation()">
            <div class="modal-header">
                <h2 class="modal-title">פרטי המשתמש</h2>
                <button class="modal-close" type="button" aria-label="סגור" onclick="closeModal()">×</button>
            </div>
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
                <button class="btn-secondary" type="button" onclick="closeModal()">ביטול</button>
                <button class="btn-primary" type="button" onclick="saveUserFromModal()">שמור</button>
            </div>
        </div>
    `;
    overlay.onclick = () => closeModal();
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

function saveUserFromModal() {
    const name = document.getElementById('userName').value.trim();
    if (!name) { alert('שם חובה'); return; }
    const role = document.getElementById('userRole').value.trim();
    const hue = parseInt(document.getElementById('userHue').value, 10) || 0;
    saveUser({ name, role, hue });
    closeModal();
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

function openProjectSettings(id, event) {
    if (event) event.stopPropagation();
    const project = getProjects().find(p => p.id === id);
    if (!project) return;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'projectSettingsModal';

    overlay.innerHTML = `
        <div class="modal" onclick="event.stopPropagation()" style="max-width: 480px;">
            <div class="modal-header">
                <h2 class="modal-title">הגדרות פרויקט</h2>
                <button class="modal-close" type="button" aria-label="סגור" onclick="closeProjectSettings()">×</button>
            </div>
            <div class="modal-body">
                <div class="field">
                    <label class="field-label">שם הפרויקט *</label>
                    <input type="text" id="projectName" class="field-input" value="${project.name}" placeholder="שם הפרויקט">
                </div>
                <div class="field">
                    <label class="field-label">תיאור</label>
                    <textarea id="projectDescription" class="field-textarea" placeholder="תיאור הפרויקט...">${project.description || ''}</textarea>
                </div>
                <div class="field">
                    <label class="field-label">צבע פרויקט</label>
                    <div class="color-swatches">
                        ${HUES.map((hue, idx) => `<button class="color-swatch${idx === project.hueIdx ? ' selected' : ''}" type="button" data-hue-idx="${idx}" style="background: hsl(${hue}, 70%, 55%);" aria-label="צבע ${idx}"></button>`).join('')}
                    </div>
                </div>
                <div class="field">
                    <label class="field-label">סטטוס</label>
                    <select id="projectStatus" class="field-select">
                        <option value="active" ${(project.status || 'active') === 'active' ? 'selected' : ''}>פעיל</option>
                        <option value="archived" ${project.status === 'archived' ? 'selected' : ''}>בארכיון</option>
                    </select>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeProjectSettings()">ביטול</button>
                <button class="btn-primary" onclick="saveProjectSettings(${id})">שמור</button>
            </div>
        </div>
    `;

    overlay.onclick = () => closeProjectSettings();
    document.body.appendChild(overlay);

    // Wire up color swatch clicks
    overlay.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.addEventListener('click', function() {
            overlay.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
            this.classList.add('selected');
        });
    });
}

function closeProjectSettings() {
    const m = document.getElementById('projectSettingsModal');
    if (m) m.remove();
}

function saveProjectSettings(id) {
    const name = document.getElementById('projectName').value.trim();
    if (!name) {
        showAlert('שם הפרויקט חובה');
        return;
    }

    const description = document.getElementById('projectDescription').value.trim();
    const status = document.getElementById('projectStatus').value;
    const selectedSwatch = document.querySelector('.color-swatch.selected');
    const hueIdx = selectedSwatch ? parseInt(selectedSwatch.dataset.hueIdx) : 0;

    const projects = getProjects();
    const project = projects.find(p => p.id === id);
    if (!project) return;

    project.name = escapeHtml(name);
    project.description = escapeHtml(description);
    project.status = status;
    project.hueIdx = hueIdx;

    saveProjects(projects);
    closeProjectSettings();
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

    list.innerHTML = '';

    if (projects.length === 0) {
        list.innerHTML = '<div style="padding: 12px; text-align: center; color: var(--ink-f); font-size: 12px;">אין פרויקטים עדיין</div>';
    } else {
        const cols = getColumns();
        const lastColId = cols.length ? cols[cols.length - 1].id : null;
        projects.forEach((p) => {
            const taskCount = getTasks(p.id).filter(t => t.state !== lastColId).length;
            const isActive = p.id === currentProjectId;
            const hue = HUES[p.hueIdx || 0];

            const el = document.createElement('div');
            el.className = `project-item ${isActive ? 'active' : ''}`;
            el.style.setProperty('--hue', hue);
            el.setAttribute('role', 'option');
            el.setAttribute('aria-selected', isActive ? 'true' : 'false');
            el.onclick = () => { selectProject(p.id); closeProjectDropdown(); };
            el.innerHTML = `
                <span class="project-dot"></span>
                <span class="project-name">${p.name}</span>
                <span class="project-count">${taskCount}</span>
                <button class="project-delete-btn" onclick="deleteProject(${p.id}, event)" title="מחק">×</button>
            `;
            list.appendChild(el);
        });
    }

    updateSelectorButton();
    renderProjectDetails();
}

function updateSelectorButton() {
    const btn = document.getElementById('projectSelectorBtn');
    const dot = document.getElementById('selectorDot');
    const nameEl = document.getElementById('selectorProjectName');
    if (!btn || !dot || !nameEl) return;

    if (currentProjectId) {
        const project = getProjects().find(p => p.id === currentProjectId);
        if (project) {
            const hue = HUES[project.hueIdx || 0];
            dot.style.setProperty('--hue', hue);
            dot.style.background = `oklch(0.72 0.12 ${hue})`;
            nameEl.textContent = project.name;
            return;
        }
    }
    dot.style.background = 'var(--line-h)';
    nameEl.textContent = 'בחר פרויקט';
}

function renderProjectDetails() {
    const panel = document.getElementById('projectDetails');
    if (!panel) return;

    if (!currentProjectId) {
        panel.innerHTML = '<div class="project-details-empty">בחר פרויקט להצגת פרטים</div>';
        return;
    }

    const project = getProjects().find(p => p.id === currentProjectId);
    if (!project) {
        panel.innerHTML = '<div class="project-details-empty">בחר פרויקט להצגת פרטים</div>';
        return;
    }

    const hue = HUES[project.hueIdx || 0];
    const tasks = getTasks(project.id);
    const cols = getColumns();
    const createdDate = new Date(project.createdAt).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });

    const statsHtml = cols.map(col => {
        const count = tasks.filter(t => t.state === col.id).length;
        return `<div class="project-stat">
            <span class="project-stat-dot" style="--col-hue: ${col.hue};"></span>
            <span class="project-stat-label">${col.name}</span>
            <span class="project-stat-count">${count}</span>
        </div>`;
    }).join('');

    const links = Array.isArray(project.links) ? project.links : [];
    const linksHtml = links.map(l => `
        <div class="project-link-btn" data-link-id="${l.id}" title="${l.url}">
            <span class="project-link-icon">${renderLinkIcon(l.icon)}</span>
            <span class="project-link-name">${l.name}</span>
            <button class="project-link-edit" type="button" data-edit-link="${l.id}" aria-label="ערוך">✎</button>
            <button class="project-link-del" type="button" data-del-link="${l.id}" aria-label="מחק">×</button>
        </div>
    `).join('');

    panel.innerHTML = `
        <div class="project-details-header" style="--hue: ${hue};">
            <div class="project-details-color-bar"></div>
            <div class="project-details-name">${project.name}</div>
        </div>
        <div class="project-details-body">
            <div class="project-details-section-label">משימות לפי שלב</div>
            <div class="project-stats">${statsHtml}</div>

            <div class="project-details-section-label">קישורים</div>
            <div class="project-links">
                ${linksHtml}
                <button class="project-link-add" type="button" id="addLinkBtn">
                    <span class="project-link-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14"/><path d="M5 12h14"/></svg></span>
                    <span class="project-link-name">הוסף קישור</span>
                </button>
            </div>

            <div class="project-details-meta">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span>נוצר ${createdDate}</span>
            </div>
        </div>
    `;

    const addBtn = panel.querySelector('#addLinkBtn');
    if (addBtn) addBtn.addEventListener('click', () => openLinkModal(project.id, null));

    panel.querySelectorAll('.project-link-btn').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target.closest('[data-edit-link]') || e.target.closest('[data-del-link]')) return;
            const id = el.dataset.linkId;
            const link = links.find(l => l.id === id);
            if (link && link.url) {
                if (link.url.startsWith('file:')) {
                    const blobFile = window._fileBlobs && window._fileBlobs[link.url];
                    if (blobFile) {
                        const blobUrl = URL.createObjectURL(blobFile);
                        window.open(blobUrl, '_blank', 'noopener');
                    } else {
                        window.open(link.url, '_blank', 'noopener');
                    }
                } else {
                    window.open(link.url, '_blank', 'noopener');
                }
            }
        });
    });
    panel.querySelectorAll('[data-edit-link]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            openLinkModal(project.id, btn.dataset.editLink);
        });
    });
    panel.querySelectorAll('[data-del-link]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (await showConfirm('למחוק את הקישור?')) deleteLink(project.id, btn.dataset.delLink);
        });
    });
}

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
    const linkType = link && link.url && link.url.startsWith('file:') ? 'file' : 'http';
    const fileDisplayName = linkType === 'file' ? link.url.replace('file://', '') : '';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'linkModal';
    overlay.innerHTML = `
        <div class="modal" onclick="event.stopPropagation()" style="max-width: 440px;">
            <div class="modal-header">
                <h2 class="modal-title">${isNew ? 'קישור חדש' : 'עריכת קישור'}</h2>
                <button class="modal-close" type="button" aria-label="סגור" onclick="closeLinkModal()">×</button>
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
                    </div>
                </div>
                <div class="field">
                    <label class="field-label">קישור *</label>
                    <div id="linkInputContainer">
                        <input type="text" id="linkUrl" class="field-input" value="${link && linkType === 'http' ? link.url : ''}" placeholder="https://..." style="display: ${linkType === 'http' ? 'block' : 'none'}">
                        <div style="display: ${linkType === 'file' ? 'block' : 'none'}">
                            <div class="file-upload-row">
                                <button type="button" id="filePickerBtn" class="file-picker-btn">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                    העלאה
                                </button>
                                <button type="button" id="fileHelpBtn" class="file-help-btn" aria-label="עזרה" title="איך מעתיקים נתיב?">?</button>
                            </div>
                            <input type="file" id="linkFileInput" style="display:none;">
                            <input type="text" id="linkFileUrl" class="field-input" value="${linkType === 'file' && link ? link.url : ''}" placeholder="הדבק כאן את הנתיב המלא" style="margin-top: 8px; direction: ltr; text-align: left;">
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
                <button class="btn-secondary" type="button" onclick="closeLinkModal()">ביטול</button>
                <button class="btn-primary" type="button" id="saveLinkBtn">שמור</button>
            </div>
        </div>
    `;
    overlay.onclick = () => closeLinkModal();
    document.body.appendChild(overlay);

    // Link type selector
    const typeButtons = overlay.querySelectorAll('.link-type-btn');
    typeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            typeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const urlInput = overlay.querySelector('#linkUrl');
            const fileInputDiv = overlay.querySelector('#linkInputContainer > div');
            if (type === 'http') {
                urlInput.style.display = 'block';
                if (fileInputDiv) fileInputDiv.style.display = 'none';
            } else {
                urlInput.style.display = 'none';
                if (fileInputDiv) fileInputDiv.style.display = 'block';
            }
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

    overlay.querySelectorAll('.link-icon-opt').forEach(b => {
        b.addEventListener('click', () => {
            overlay.querySelectorAll('.link-icon-opt').forEach(x => x.classList.remove('selected'));
            b.classList.add('selected');
            overlay.querySelector('#linkIconCustom').value = '';
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
    }

    if (linkId) {
        const l = project.links.find(x => x.id === linkId);
        if (l) { l.name = escapeHtml(name); l.url = url; l.icon = icon; }
    } else {
        project.links.push({ id: 'link_' + Date.now(), name: escapeHtml(name), url, icon });
    }

    saveProjects(projects);
    closeLinkModal();
    renderProjectDetails();
}

function deleteLink(projectId, linkId) {
    const projects = getProjects();
    const project = projects.find(p => p.id === projectId);
    if (!project || !Array.isArray(project.links)) return;
    project.links = project.links.filter(l => l.id !== linkId);
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
        taskType: data.taskType || '',
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
    if (data.taskType !== undefined) task.taskType = data.taskType;
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
    closeModal();
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
    board.style.gridTemplateColumns = `repeat(${columns.length}, 260px) auto`;

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

        // Drag column to reorder via header
        const headerEl = colEl.querySelector('.column-header');
        headerEl.draggable = true;
        headerEl.addEventListener('dragstart', (e) => {
            draggingColumnId = col.id;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', col.id);
            colEl.classList.add('dragging-column');
        });
        headerEl.addEventListener('dragend', () => {
            draggingColumnId = null;
            colEl.classList.remove('dragging-column');
            document.querySelectorAll('.kanban-column').forEach(c => c.classList.remove('drop-over'));
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

    card.addEventListener('click', () => {
        openEditModal(task.id);
    });

    const priorityLabel = { high: 'גבוה', med: 'בינוני', low: 'נמוך' }[task.priority] || 'בינוני';
    const tagClass = KNOWN_TAGS.includes(task.tag) ? `tag-${task.tag}` : 'tag-default';
    const overdueSoon = task.dueIn !== null && task.dueIn !== undefined && task.dueIn <= 7;
    const idStr = String(task.id).padStart(4, '0');
    const typeInfo = task.taskType ? getTaskTypes().find(ty => ty.id === task.taskType) : null;

    card.innerHTML = `
        <span class="card-stripe"></span>
        <div class="card-top">
            <div class="card-badges">
                ${typeInfo ? `<span class="task-type-badge" style="--type-hue: ${typeInfo.hue};">${typeInfo.name}</span>` : ''}
                ${task.tag ? `<span class="tag ${tagClass}">${task.tag}</span>` : ''}
            </div>
        </div>
        <span class="card-id">#${idStr}</span>
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
            if (draggingColumnId !== null) {
                reorderColumn(draggingColumnId, col.dataset.state);
                draggingColumnId = null;
                return;
            }
            if (draggingTaskId !== null) {
                const newState = col.dataset.state;
                moveTask(draggingTaskId, newState);
            }
        });
    });
}

function reorderColumn(draggedId, targetId) {
    if (draggedId === targetId) return;
    const columns = getColumns();
    const fromIdx = columns.findIndex(c => c.id === draggedId);
    const toIdx = columns.findIndex(c => c.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = columns.splice(fromIdx, 1);
    columns.splice(toIdx, 0, moved);
    saveColumns(columns);
    renderKanban();
}

// ===== UI Update =====
function updateUI() {
    const board = document.getElementById('kanbanBoard');
    const list = document.getElementById('listView');
    const empty = document.getElementById('emptyState');
    const title = document.getElementById('pageTitle');
    const breadcrumb = document.getElementById('currentProjectName');
    const subtitle = document.getElementById('pageSubtitle');

    renderProjectDetails();
    updateSelectorButton();

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
    const t = task || { title: '', description: '', state: fallbackState, priority: 'med', tag: '', assignee: '', due: '', dueIn: null, taskType: '' };

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
                        <label class="field-label">סוג משימה</label>
                        <select id="modalType" class="field-select">
                            <option value="">— ללא —</option>
                            ${getTaskTypes().map(ty => `<option value="${ty.id}" ${t.taskType === ty.id ? 'selected' : ''}>${ty.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="field">
                        <label class="field-label">תגית</label>
                        <input type="text" id="modalTag" class="field-input" value="${unescapeForInput(t.tag)}" placeholder="מסמכים, פגישה...">
                    </div>
                </div>
                <div class="field-row">
                    <div class="field">
                        <label class="field-label">אחראי</label>
                        <input type="text" id="modalAssignee" class="field-input" value="${unescapeForInput(t.assignee)}" placeholder="שם מלא">
                    </div>
                    <div class="field">
                        <label class="field-label">תאריך יעד</label>
                        <input type="date" id="modalDueDate" class="field-input" value="${parseDueDate(t.due)}">
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                ${!isNew ? `<button class="btn-danger" onclick="deleteTask(${t.id});">מחק</button>` : ''}
                <div style="margin-inline-start: auto; display: flex; gap: 8px;">
                    <button class="btn-secondary" onclick="closeModal()">ביטול</button>
                    <button class="btn-primary" onclick="saveTaskFromModal(${isNew ? 'null' : t.id})">${isNew ? 'צור משימה' : 'שמור'}</button>
                </div>
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
        dueIn: dueInfo.dueIn,
        taskType: document.getElementById('modalType').value,
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
    let debounce = null;
    let activeSearchIndex = -1;

    function setActiveRow(rows, idx) {
        rows.forEach(r => r.classList.remove('active'));
        rows[idx].classList.add('active');
        rows[idx].scrollIntoView({ block: 'nearest' });
    }

    input.addEventListener('input', () => {
        clearTimeout(debounce);
        activeSearchIndex = -1;
        debounce = setTimeout(() => {
            const term = input.value.trim();
            if (term.length >= 2) {
                openSearchResults(term);
                if (searchPageTerm !== null) {
                    searchPageTerm = term;
                    searchPageFilters = { projectId: null, priority: null, state: null };
                    renderSearchPage();
                }
            } else {
                closeSearchResults();
            }
        }, 150);
    });

    input.addEventListener('focus', () => {
        if (input.value.trim().length >= 2) openSearchResults(input.value.trim());
    });

    input.addEventListener('keydown', (e) => {
        const panel = document.getElementById('searchResults');

        if (e.key === 'Enter') {
            const term = input.value.trim();
            if (panel) {
                const rows = Array.from(panel.querySelectorAll('.search-row'));
                if (activeSearchIndex >= 0 && rows[activeSearchIndex]) {
                    rows[activeSearchIndex].click();
                } else if (term.length >= 2) {
                    openSearchPage(term);
                }
            } else if (term.length >= 2) {
                openSearchPage(term);
            }
            return;
        }

        if (!panel) return;
        const rows = Array.from(panel.querySelectorAll('.search-row'));
        if (!rows.length) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeSearchIndex = Math.min(activeSearchIndex + 1, rows.length - 1);
            setActiveRow(rows, activeSearchIndex);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeSearchIndex = Math.max(activeSearchIndex - 1, 0);
            setActiveRow(rows, activeSearchIndex);
        }
    });
}

function openSearchResults(term) {
    closeSearchResults();

    const q = term.toLowerCase();
    const projects = getProjects();
    const projectMap = Object.fromEntries(projects.map(p => [p.id, p]));
    const columns = getColumns();
    const stateLabel = id => (columns.find(c => c.id === id) || {}).name || id;
    const stateHue  = id => (columns.find(c => c.id === id) || {}).hue  || 220;
    const types = getTaskTypes();
    const typeMap = Object.fromEntries(types.map(t => [t.id, t]));

    const allMatches = getAllTasks().filter(t =>
        (t.title       || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        (t.assignee    || '').toLowerCase().includes(q) ||
        (t.tag         || '').toLowerCase().includes(q)
    );
    const total = allMatches.length;
    const matches = allMatches.slice(0, 8);

    const wrap = document.getElementById('topbar-search-wrap') ||
                 document.querySelector('.topbar-search-wrap');
    const rect = wrap.getBoundingClientRect();

    const panel = document.createElement('div');
    panel.id = 'searchResults';
    panel.className = 'search-results';
    panel.style.top  = rect.bottom + 'px';
    panel.style.left = rect.left + 'px';

    const priLabel = { high: 'גבוה', med: 'בינוני', low: 'נמוך' };

    if (matches.length === 0) {
        panel.innerHTML = `<div class="search-empty">אין תוצאות עבור "<strong>${escapeHtml(term)}</strong>"</div>`;
    } else {
        panel.innerHTML = `
            <div class="search-header" onclick="openSearchPage('${escapeAttr(term)}')" style="cursor: pointer; user-select: none;">${total} תוצאות</div>
            ${matches.map(t => {
                const proj = projectMap[t.projectId];
                const ty   = t.taskType ? typeMap[t.taskType] : null;
                return `
                <div class="search-row" data-proj="${t.projectId}" data-task="${t.id}">
                    <div class="search-row-main">
                        <span class="search-row-title">${highlightMatch(t.title, q)}</span>
                        ${ty ? `<span class="task-type-badge" style="--type-hue:${ty.hue};">${ty.name}</span>` : ''}
                    </div>
                    <div class="search-row-meta">
                        <span class="search-row-id">#${String(t.id).padStart(4,'0')}</span>
                        <span class="search-proj">${proj ? proj.name : '—'}</span>
                        <span class="state-pill" style="--col-hue:${stateHue(t.state)};">${stateLabel(t.state)}</span>
                        <span class="priority priority-${t.priority || 'med'}">${priLabel[t.priority] || 'בינוני'}</span>
                    </div>
                </div>`;
            }).join('')}
        `;

        panel.querySelectorAll('.search-row').forEach(row => {
            row.addEventListener('click', () => {
                closeSearchResults();
                document.getElementById('searchInput').value = '';
                jumpToTask(Number(row.dataset.proj), Number(row.dataset.task));
            });
        });

        if (total > 8) {
            const footer = document.createElement('div');
            footer.className = 'search-show-all';
            footer.textContent = `הצג כל ${total} תוצאות`;
            footer.addEventListener('click', () => openSearchPage(term));
            panel.appendChild(footer);
        }
    }

    document.body.appendChild(panel);
}

function closeSearchResults() {
    const p = document.getElementById('searchResults');
    if (p) p.remove();
}

function openSearchPage(term) {
    closeSearchResults();
    closePopovers();
    document.getElementById('searchInput').value = term;
    searchPageTerm = term;
    searchPageFilters = { projectId: null, priority: null, state: null };
    ['kanbanBoard', 'listView', 'emptyState'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    const old = document.getElementById('searchPage');
    if (old) old.remove();
    const page = document.createElement('div');
    page.id = 'searchPage';
    page.className = 'search-page';
    document.querySelector('.main').appendChild(page);
    renderSearchPage();
}

function renderSearchPage() {
    const page = document.getElementById('searchPage');
    if (!page) return;

    const q = (searchPageTerm || '').toLowerCase();
    const projects = getProjects();
    const projectMap = Object.fromEntries(projects.map(p => [p.id, p]));
    const columns = getColumns();
    const stateLabel = id => (columns.find(c => c.id === id) || {}).name || id;
    const stateHue  = id => (columns.find(c => c.id === id) || {}).hue  || 220;
    const types = getTaskTypes();
    const typeMap = Object.fromEntries(types.map(t => [t.id, t]));
    const priLabels = { high: 'גבוה', med: 'בינוני', low: 'נמוך' };
    const lastColId = columns.length ? columns[columns.length - 1].id : null;

    const baseMatches = getAllTasks().filter(t =>
        (t.title       || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        (t.assignee    || '').toLowerCase().includes(q) ||
        (t.tag         || '').toLowerCase().includes(q)
    );

    let matches = baseMatches.slice();
    if (searchPageFilters.projectId) matches = matches.filter(t => t.projectId === searchPageFilters.projectId);
    if (searchPageFilters.priority)  matches = matches.filter(t => t.priority  === searchPageFilters.priority);
    if (searchPageFilters.state)     matches = matches.filter(t => t.state     === searchPageFilters.state);

    const projectsWithMatches = [...new Set(baseMatches.map(t => t.projectId))].map(id => projectMap[id]).filter(Boolean);
    const statesInMatches     = [...new Set(baseMatches.map(t => t.state))];
    const prioritiesInMatches = [...new Set(baseMatches.map(t => t.priority).filter(Boolean))];
    const hasFilters = searchPageFilters.projectId || searchPageFilters.priority || searchPageFilters.state;
    const showFilters = projectsWithMatches.length > 1 || statesInMatches.length > 1 || prioritiesInMatches.length > 1;

    page.innerHTML = `
        <div class="search-page-header">
            <button class="search-back-btn" type="button" onclick="closeSearchPage()">← חזרה</button>
            <span class="search-page-title">תוצאות עבור "<strong>${escapeHtml(searchPageTerm)}</strong>"</span>
            <span class="search-page-count">${matches.length} תוצאות</span>
        </div>
        ${showFilters ? `
        <div class="search-page-filters">
            ${projectsWithMatches.length > 1 ? `
                <span class="search-filter-label">פרויקט:</span>
                <div class="search-filter-chips">
                    ${projectsWithMatches.map(p => `
                        <button class="search-filter-chip ${searchPageFilters.projectId === p.id ? 'active' : ''}" type="button" onclick="setSearchFilter('projectId', ${p.id})">${p.name}</button>
                    `).join('')}
                </div>
            ` : ''}
            ${prioritiesInMatches.length > 1 ? `
                <span class="search-filter-label">תעדוף:</span>
                <div class="search-filter-chips">
                    ${prioritiesInMatches.map(pri => `
                        <button class="search-filter-chip ${searchPageFilters.priority === pri ? 'active' : ''}" type="button" onclick="setSearchFilter('priority', '${pri}')">${priLabels[pri] || pri}</button>
                    `).join('')}
                </div>
            ` : ''}
            ${statesInMatches.length > 1 ? `
                <span class="search-filter-label">מצב:</span>
                <div class="search-filter-chips">
                    ${statesInMatches.map(s => `
                        <button class="search-filter-chip ${searchPageFilters.state === s ? 'active' : ''}" type="button" onclick="setSearchFilter('state', '${s}')">${stateLabel(s)}</button>
                    `).join('')}
                </div>
            ` : ''}
            ${hasFilters ? `<button class="search-filter-clear" type="button" onclick="clearSearchFilters()">נקה הכל</button>` : ''}
        </div>
        ` : ''}
        <div class="search-page-body">
            ${matches.length === 0
                ? `<div class="search-page-empty">אין תוצאות</div>`
                : `<table class="list-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>סוג</th>
                            <th>כותרת</th>
                            <th>פרויקט</th>
                            <th>מצב</th>
                            <th>תעדוף</th>
                            <th>תגית</th>
                            <th>אחראי</th>
                            <th>תאריך יעד</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${matches.map(t => `
                            <tr data-id="${t.id}" class="list-row ${t.state === lastColId ? 'done' : ''}">
                                <td class="list-id">#${String(t.id).padStart(4, '0')}</td>
                                <td>${t.taskType ? (() => { const ty = typeMap[t.taskType]; return ty ? `<span class="task-type-badge" style="--type-hue: ${ty.hue};">${ty.name}</span>` : ''; })() : ''}</td>
                                <td class="list-title">${highlightMatch(t.title, q)}</td>
                                <td class="list-project">${projectMap[t.projectId] ? projectMap[t.projectId].name : '—'}</td>
                                <td><span class="state-pill" style="--col-hue: ${stateHue(t.state)};">${stateLabel(t.state)}</span></td>
                                <td><span class="priority priority-${t.priority || 'med'}">${priLabels[t.priority] || 'בינוני'}</span></td>
                                <td>${t.tag ? `<span class="tag tag-${KNOWN_TAGS.includes(t.tag) ? t.tag : 'default'}">${t.tag}</span>` : ''}</td>
                                <td>${t.assignee ? `<span class="list-assignee">${t.assignee}</span>` : ''}</td>
                                <td>${t.due || ''}</td>
                                <td>
                                    <button class="card-action-btn" type="button" aria-label="ערוך" onclick="openEditModalForTask(${t.id})">${ICONS.pencil}</button>
                                    <button class="card-action-btn delete" type="button" aria-label="מחק" onclick="deleteTask(${t.id}, event)">×</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>`
            }
        </div>
    `;
}

function closeSearchPage() {
    const p = document.getElementById('searchPage');
    if (p) p.remove();
    searchPageTerm = null;
    searchPageFilters = { projectId: null, priority: null, state: null };
    document.getElementById('searchInput').value = '';
    updateUI();
}

function setSearchFilter(key, value) {
    if (key === 'projectId') value = Number(value);
    searchPageFilters[key] = searchPageFilters[key] === value ? null : value;
    renderSearchPage();
}

function clearSearchFilters() {
    searchPageFilters = { projectId: null, priority: null, state: null };
    renderSearchPage();
}

function openEditModalForTask(taskId) {
    const task = getAllTasks().find(t => t.id === taskId);
    if (!task) return;
    currentProjectId = task.projectId;
    setCurrentProjectId(task.projectId);
    openEditModal(taskId);
}

function highlightMatch(text, q) {
    const safe = escapeHtml(text);
    const safeQ = escapeHtml(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return safe.replace(new RegExp(`(${safeQ})`, 'gi'), '<mark>$1</mark>');
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
                    <th>סוג</th>
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
                        <td>${t.taskType ? (() => { const ty = getTaskTypes().find(x => x.id === t.taskType); return ty ? `<span class="task-type-badge" style="--type-hue: ${ty.hue};">${ty.name}</span>` : ''; })() : ''}</td>
                        <td class="list-title">${t.title}</td>
                        ${isAll ? `<td class="list-project">${projectMap[t.projectId] || '—'}</td>` : ''}
                        <td><span class="state-pill" style="--col-hue: ${stateHue(t.state)};">${stateLabel(t.state)}</span></td>
                        <td><span class="priority priority-${t.priority || 'med'}">${priLabels[t.priority] || 'בינוני'}</span></td>
                        <td>${t.tag ? `<span class="tag tag-${KNOWN_TAGS.includes(t.tag) ? t.tag : 'default'}">${t.tag}</span>` : ''}</td>
                        <td>${t.assignee ? `<span class="list-assignee">${t.assignee}</span>` : ''}</td>
                        <td>${t.due || ''}</td>
                        <td>
                            <button class="card-action-btn" type="button" aria-label="ערוך" onclick="openEditModal(${t.id})">${ICONS.pencil}</button>
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
    if (searchPageTerm !== null) { renderSearchPage(); return; }
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
            ? `<div class="popover-empty">${ICONS.check} אין התראות חדשות</div>`
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
            <button class="popover-menu-item" type="button" onclick="exportData()">${ICONS.export} ייצא JSON</button>
            <button class="popover-menu-item" type="button" onclick="document.getElementById('importFile').click()">${ICONS.import} ייבא JSON</button>
            <button class="popover-menu-item" type="button" onclick="showBackupInfo()">${ICONS.save} פרטי גיבוי</button>
            <button class="popover-menu-item" type="button" onclick="openManageTypesModal()">${ICONS.tag} ניהול סוגי משימות</button>
            <button class="popover-menu-item danger" type="button" onclick="clearAllData()">${ICONS.trash} נקה את כל הנתונים</button>
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
            <button class="popover-menu-item" type="button" onclick="openUserProfileModal()">👤 ערוך פרופיל</button>
            <button class="popover-menu-item" type="button" onclick="exportData()">📥 ייצא נתונים</button>
            <button class="popover-menu-item" type="button" onclick="showBackupInfo()">💾 פרטי גיבוי</button>
            <button class="popover-menu-item" type="button" onclick="exportData()">${ICONS.export} ייצא נתונים</button>
            <button class="popover-menu-item" type="button" onclick="showBackupInfo()">${ICONS.save} פרטי גיבוי</button>
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
        <div class="modal" onclick="event.stopPropagation()" style="max-width:440px;">
            <div class="modal-header">
                <h2 class="modal-title">ניהול סוגי משימות</h2>
                <button class="modal-close" type="button" aria-label="סגור" onclick="closeManageTypesModal()">×</button>
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
                <button class="btn-primary" type="button" onclick="closeManageTypesModal()">סגור</button>
            </div>
        </div>
    `;

    overlay.onclick = () => closeManageTypesModal();
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
        types.push({ id: 'type_' + Date.now(), name, hue: selectedHue });
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
    const ok1 = await showConfirm('זה ימחק את כל הפרויקטים והמשימות!\n\nהאם אתה בטוח?', 'מחיקת כל הנתונים', 'מחק הכל', 'ביטול');
    if (!ok1) return;
    const ok2 = await showConfirm('אישור אחרון — אין דרך חזרה!', 'אישור סופי', 'מחק', 'ביטול');
    if (!ok2) return;
    [DB.projects, DB.tasks, DB.backup, DB.currentProject].forEach(k => localStorage.removeItem(k));
    location.reload();
}

// ===== Event Listeners =====
function setupEventListeners() {
    // Project selector dropdown toggle
    const selectorBtn = document.getElementById('projectSelectorBtn');
    if (selectorBtn) selectorBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleProjectDropdown(); });

    // Close project dropdown on outside click
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('projectDropdown');
        const sBtn = document.getElementById('projectSelectorBtn');
        if (dropdown && dropdown.classList.contains('open') &&
            !dropdown.contains(e.target) && e.target !== sBtn && !sBtn.contains(e.target)) {
            closeProjectDropdown();
        }
    });

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
        const sr = document.getElementById('searchResults');
        if (sr && !sr.contains(e.target) && !e.target.closest('.topbar-search-wrap') && !e.target.closest('#searchPage')) closeSearchResults();
    });

    // Escape key to close modal / popover / search
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const m = document.getElementById('taskModal');
            if (m) { closeModal(); return; }
            const sp = document.getElementById('searchPage');
            if (sp) { closeSearchPage(); return; }
            if (document.getElementById('searchResults')) {
                closeSearchResults();
                document.getElementById('searchInput').value = '';
                return;
            }
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
window.closeLinkModal = closeLinkModal;
window.openProjectSettings = openProjectSettings;
window.closeProjectSettings = closeProjectSettings;
window.saveProjectSettings = saveProjectSettings;
window.saveTaskFromModal = saveTaskFromModal;
window.closeModal = closeModal;
window.openUserProfileModal = openUserProfileModal;
window.saveUserFromModal = saveUserFromModal;
window.setFilter = setFilter;
window.setSort = setSort;
window.clearFilters = clearFilters;
window.closePopovers = closePopovers;
window.exportData = exportData;
window.showBackupInfo = showBackupInfo;
window.clearAllData = clearAllData;
window.jumpToTask = jumpToTask;
window.setListScope = setListScope;
window.openManageTypesModal = openManageTypesModal;
window.closeManageTypesModal = closeManageTypesModal;
window.closeSearchPage = closeSearchPage;
window.setSearchFilter = setSearchFilter;
window.clearSearchFilters = clearSearchFilters;
window.openEditModalForTask = openEditModalForTask;
