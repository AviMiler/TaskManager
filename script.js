// ===== Storage Keys =====
const DB = {
    projects: 'tb_projects',
    tasks: 'tb_tasks',
    backup: 'tb_backup',
    currentProject: 'tb_currentProject'
};

let currentProjectId = null;
let editingTaskId = null;
let draggingTaskId = null;
let nextTaskId = 1000;

// Hue palette for project dots
const HUES = [230, 160, 40, 290, 0, 60, 120, 180, 260, 320];

// Tag colors known (Hebrew)
const KNOWN_TAGS = ['מסמכים', 'פגישה', 'פנימי', 'bug', 'feature'];

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

function getCurrentProjectId() {
    const saved = localStorage.getItem(DB.currentProject);
    return saved ? parseInt(saved) : null;
}

function setCurrentProjectId(id) {
    if (id) localStorage.setItem(DB.currentProject, id.toString());
    else localStorage.removeItem(DB.currentProject);
}

// ===== Projects =====
function addProject(name) {
    name = name.trim();
    if (!name) return;

    const projects = getProjects();
    if (projects.find(p => p.name === name)) {
        alert('פרויקט עם שם זה כבר קיים');
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

function deleteProject(id, event) {
    if (event) event.stopPropagation();
    if (!confirm('למחוק את הפרויקט וכל המשימות שלו?')) return;

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

    projects.forEach((p) => {
        const taskCount = getTasks(p.id).filter(t => t.state !== 'done').length;
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
function addTask(data) {
    if (!currentProjectId) {
        alert('בחר פרויקט תחילה');
        return;
    }
    if (!data.title || !data.title.trim()) {
        alert('כותרת חובה');
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
    renderKanban();
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
    renderKanban();
}

function deleteTask(id, event) {
    if (event) event.stopPropagation();
    if (!confirm('למחוק את המשימה?')) return;

    const tasks = getAllTasks().filter(t => t.id !== id);
    saveTasks(tasks);
    loadProjects();
    renderKanban();
}

function moveTask(id, newState) {
    updateTask(id, { state: newState });
}

// ===== Kanban Rendering =====
function renderKanban() {
    if (!currentProjectId) return;
    const tasks = getTasks(currentProjectId);

    const states = ['todo', 'doing', 'done'];
    states.forEach(state => {
        const col = document.getElementById(`column-${state}`);
        const stateTasks = tasks.filter(t => t.state === state);

        const colCount = document.querySelector(`.kanban-column[data-state="${state}"] .column-count`);
        colCount.textContent = stateTasks.length;

        col.innerHTML = '';

        if (stateTasks.length === 0) {
            col.innerHTML = '<div class="column-empty">גרור משימה לכאן</div>';
            return;
        }

        stateTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach(task => {
            col.appendChild(buildCard(task));
        });
    });

    // Update subtitle
    const total = tasks.length;
    const done = tasks.filter(t => t.state === 'done').length;
    const doing = tasks.filter(t => t.state === 'doing').length;
    document.getElementById('pageSubtitle').textContent =
        `${total} משימות · ${done} הושלמו · ${doing} בעבודה`;
}

function buildCard(task) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.state = task.state;
    card.dataset.id = task.id;
    card.draggable = true;

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
        <div class="card-title ${task.state === 'done' ? 'done' : ''}">${task.title}</div>
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
    const empty = document.getElementById('emptyState');
    const title = document.getElementById('pageTitle');
    const breadcrumb = document.getElementById('currentProjectName');
    const subtitle = document.getElementById('pageSubtitle');

    if (currentProjectId) {
        const project = getProjects().find(p => p.id === currentProjectId);
        if (project) {
            title.textContent = project.name;
            breadcrumb.textContent = project.name;
            board.style.display = 'grid';
            empty.style.display = 'none';
            renderKanban();
            return;
        }
    }
    title.textContent = 'בחר פרויקט';
    breadcrumb.textContent = 'Workspace';
    subtitle.textContent = 'כדי להתחיל, בחר או צור פרויקט';
    board.style.display = 'none';
    empty.style.display = 'flex';
}

// ===== Modal =====
function openEditModal(taskId) {
    if (!currentProjectId) {
        alert('בחר פרויקט תחילה');
        return;
    }

    editingTaskId = taskId;
    const task = taskId ? getAllTasks().find(t => t.id === taskId) : null;
    const isNew = !task;

    const modal = buildModal(task, isNew);
    document.body.appendChild(modal);

    setTimeout(() => {
        const titleInput = modal.querySelector('#modalTitle');
        if (titleInput) titleInput.focus();
    }, 50);
}

function buildModal(task, isNew) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'taskModal';

    const t = task || { title: '', description: '', state: 'todo', priority: 'med', tag: '', assignee: '', due: '', dueIn: null };

    overlay.innerHTML = `
        <div class="modal" onclick="event.stopPropagation()">
            <div class="modal-header">
                <h2 class="modal-title">${isNew ? 'משימה חדשה' : 'עריכת משימה'}</h2>
                <button class="modal-close" onclick="closeModal()">×</button>
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
                            <option value="todo" ${t.state === 'todo' ? 'selected' : ''}>לביצוע (To Do)</option>
                            <option value="doing" ${t.state === 'doing' ? 'selected' : ''}>בביצוע (Active)</option>
                            <option value="done" ${t.state === 'done' ? 'selected' : ''}>בוצע (Closed)</option>
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

function saveTaskFromModal(taskId) {
    const title = document.getElementById('modalTitle').value;
    if (!title.trim()) {
        alert('כותרת חובה');
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

// ===== Event Listeners =====
function setupEventListeners() {
    // New project
    document.getElementById('newProjectInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addProject(e.target.value);
    });
    document.querySelector('.sidebar-add-btn').addEventListener('click', () => {
        addProject(document.getElementById('newProjectInput').value);
    });

    // Add task
    document.querySelector('.add-task-btn').addEventListener('click', () => openEditModal(null));

    // Column add buttons
    document.querySelectorAll('.column-add-btn').forEach(btn => {
        btn.addEventListener('click', () => openEditModal(null));
    });

    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const m = document.getElementById('taskModal');
            if (m) closeModal();
        }
    });

    setupColumnDragDrop();
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

// Expose globally for inline handlers
window.deleteProject = deleteProject;
window.deleteTask = deleteTask;
window.openEditModal = openEditModal;
window.saveTaskFromModal = saveTaskFromModal;
window.closeModal = closeModal;
