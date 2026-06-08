// Data Management
const DB = {
    projects: 'tm_projects',
    tasks: 'tm_tasks',
    backup: 'tm_backup',
    currentProject: 'tm_currentProject'
};

let currentProjectId = null;
let editingTaskId = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
    loadProjects();
    restoreCurrentProject();
});

// ============ Storage Functions ============

function loadData() {
    if (!getProjects().length) {
        createBackup();
    }
}

function getProjects() {
    const data = localStorage.getItem(DB.projects);
    return data ? JSON.parse(data) : [];
}

function getTasks(projectId) {
    const data = localStorage.getItem(DB.tasks);
    const tasks = data ? JSON.parse(data) : [];
    return tasks.filter(t => t.projectId === projectId);
}

function getAllTasks() {
    const data = localStorage.getItem(DB.tasks);
    return data ? JSON.parse(data) : [];
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

function getBackup() {
    const data = localStorage.getItem(DB.backup);
    return data ? JSON.parse(data) : null;
}

function restoreFromBackup() {
    const backup = getBackup();
    if (!backup) {
        alert('אין גיבוי זמין');
        return false;
    }

    if (confirm('האם אתה בטוח שברצונך לשחזר מגיבוי? זה יעדכן את כל הנתונים.')) {
        localStorage.setItem(DB.projects, JSON.stringify(backup.projects));
        localStorage.setItem(DB.tasks, JSON.stringify(backup.tasks));
        location.reload();
        return true;
    }
    return false;
}

function getCurrentProjectId() {
    const saved = localStorage.getItem(DB.currentProject);
    return saved ? parseInt(saved) : null;
}

function setCurrentProjectId(id) {
    if (id) {
        localStorage.setItem(DB.currentProject, id.toString());
    } else {
        localStorage.removeItem(DB.currentProject);
    }
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

// ============ Project Functions ============

function addProject(name) {
    name = name.trim();
    if (!name) {
        alert('אנא הקלד שם פרוייקט');
        return false;
    }

    const projects = getProjects();
    if (projects.find(p => p.name === name)) {
        alert('פרוייקט עם שם זה כבר קיים');
        return false;
    }

    const project = {
        id: Date.now(),
        name: escapeHtml(name),
        createdAt: new Date().toISOString()
    };

    projects.push(project);
    saveProjects(projects);
    loadProjects();
    document.getElementById('projectInput').value = '';
    return true;
}

function deleteProject(id) {
    if (!confirm('האם אתה בטוח שברצונך למחוק פרוייקט זה וכל המשימות שלו?')) {
        return false;
    }

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
    return true;
}

function selectProject(id) {
    currentProjectId = id;
    setCurrentProjectId(id);
    loadProjects();
    updateUI();
}

function loadProjects() {
    const projectsList = document.getElementById('projectsList');
    const projects = getProjects();

    projectsList.innerHTML = '';

    if (projects.length === 0) {
        projectsList.innerHTML = '<div style="padding: 20px; text-align: center; color: #9ca3af;">אין פרוייקטים עדיין</div>';
        return;
    }

    projects.forEach(project => {
        const taskCount = getTasks(project.id).length;
        const isActive = project.id === currentProjectId;

        const projectEl = document.createElement('div');
        projectEl.className = `project-item ${isActive ? 'active' : ''}`;
        projectEl.innerHTML = `
            <div class="project-name" onclick="selectProject(${project.id})">${project.name}</div>
            <div class="project-count">${taskCount}</div>
            <button class="project-delete" onclick="deleteProject(${project.id})">🗑️</button>
        `;
        projectsList.appendChild(projectEl);
    });
}

// ============ Task Functions ============

function addTask(title, description = '') {
    if (!currentProjectId) {
        alert('בחר פרוייקט תחילה');
        return false;
    }

    title = title.trim();
    if (!title) {
        alert('אנא הקלד כותרת משימה');
        return false;
    }

    const task = {
        id: Date.now(),
        projectId: currentProjectId,
        title: escapeHtml(title),
        description: escapeHtml(description),
        completed: false,
        createdAt: new Date().toISOString()
    };

    const tasks = getAllTasks();
    tasks.push(task);
    saveTasks(tasks);

    loadTasks();
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskDescription').value = '';
    return true;
}

function deleteTask(id) {
    if (!confirm('האם אתה בטוח שברצונך למחוק משימה זו?')) {
        return false;
    }

    const tasks = getAllTasks().filter(t => t.id !== id);
    saveTasks(tasks);
    loadTasks();
    return true;
}

function toggleTask(id) {
    const tasks = getAllTasks();
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTasks(tasks);
        loadTasks();
    }
}

function updateTask(id, title, description) {
    const tasks = getAllTasks();
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.title = escapeHtml(title.trim());
        task.description = escapeHtml(description.trim());
        saveTasks(tasks);
        loadTasks();
    }
}

function loadTasks() {
    const tasksList = document.getElementById('tasksList');
    const emptyState = document.getElementById('emptyState');

    if (!currentProjectId) {
        tasksList.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }

    const tasks = getTasks(currentProjectId);
    tasksList.innerHTML = '';
    emptyState.style.display = 'none';

    if (tasks.length === 0) {
        tasksList.innerHTML = '<div style="text-align: center; color: #9ca3af; padding: 40px;">אין משימות עדיין. הוסף משימה חדשה!</div>';
        return;
    }

    tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach(task => {
        const taskEl = document.createElement('div');
        taskEl.className = `task-item ${task.completed ? 'completed' : ''}`;
        taskEl.innerHTML = `
            <input
                type="checkbox"
                class="task-checkbox"
                ${task.completed ? 'checked' : ''}
                onchange="toggleTask(${task.id})"
            >
            <div class="task-content">
                <div class="task-title">${task.title}</div>
                ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
            </div>
            <div class="task-actions">
                <button class="task-btn" onclick="openEditModal(${task.id}, '${escapeAttr(task.title)}', '${escapeAttr(task.description)}')">✏️</button>
                <button class="task-btn delete" onclick="deleteTask(${task.id})">🗑️</button>
            </div>
        `;
        tasksList.appendChild(taskEl);
    });
}

// ============ Modal Functions ============

function openEditModal(id, title, description) {
    editingTaskId = id;
    document.getElementById('editTaskTitle').value = title;
    document.getElementById('editTaskDescription').value = description;
    document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    editingTaskId = null;
}

function saveEdit() {
    if (editingTaskId) {
        const title = document.getElementById('editTaskTitle').value;
        const description = document.getElementById('editTaskDescription').value;
        updateTask(editingTaskId, title, description);
        closeEditModal();
    }
}

// ============ UI Update Functions ============

function updateUI() {
    const taskInputSection = document.getElementById('taskInputSection');
    const currentProjectTitle = document.getElementById('currentProjectTitle');

    if (currentProjectId) {
        const project = getProjects().find(p => p.id === currentProjectId);
        currentProjectTitle.textContent = project ? project.name : 'בחר פרוייקט';
        taskInputSection.style.display = 'block';
        loadTasks();
    } else {
        currentProjectTitle.textContent = 'בחר פרוייקט';
        taskInputSection.style.display = 'none';
        document.getElementById('tasksList').innerHTML = '';
        document.getElementById('emptyState').style.display = 'flex';
    }
}

// ============ Event Listeners ============

function setupEventListeners() {
    // Project events
    document.getElementById('addProjectBtn').addEventListener('click', () => {
        const name = document.getElementById('projectInput').value;
        addProject(name);
    });

    document.getElementById('projectInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const name = document.getElementById('projectInput').value;
            addProject(name);
        }
    });

    // Task events
    document.getElementById('addTaskBtn').addEventListener('click', () => {
        const title = document.getElementById('taskTitle').value;
        const description = document.getElementById('taskDescription').value;
        addTask(title, description);
    });

    document.getElementById('taskTitle').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const title = document.getElementById('taskTitle').value;
            const description = document.getElementById('taskDescription').value;
            addTask(title, description);
        }
    });

    // Modal events
    document.getElementById('closeModalBtn').addEventListener('click', closeEditModal);
    document.getElementById('cancelEditBtn').addEventListener('click', closeEditModal);
    document.getElementById('saveEditBtn').addEventListener('click', saveEdit);

    document.getElementById('editModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('editModal')) {
            closeEditModal();
        }
    });

    // Backup events
    document.getElementById('backupBtn').addEventListener('click', () => {
        const backup = getBackup();
        if (!backup) {
            alert('אין גיבוי זמין');
            return;
        }
        alert(`גיבוי אחרון: ${new Date(backup.timestamp).toLocaleString('he-IL')}\n${backup.projects.length} פרוייקטים, ${backup.tasks.length} משימות`);
    });

    document.getElementById('clearDataBtn').addEventListener('click', () => {
        if (confirm('⚠️ זה מחק את כל הנתונים!\n\nהאם אתה בטוח?')) {
            if (confirm('זה הצעד האחרון - אין חזרה!')) {
                localStorage.clear();
                location.reload();
            }
        }
    });
}

// ============ Utility Functions ============

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function escapeAttr(text) {
    return text.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}
