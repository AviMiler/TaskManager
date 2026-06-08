let currentProjectId = null;

document.addEventListener('DOMContentLoaded', () => {
    loadProjects();
    document.getElementById('projectName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addProject();
    });
    document.getElementById('taskTitle').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });
});

async function loadProjects() {
    const response = await fetch('/api/projects');
    const projects = await response.json();
    const projectsList = document.getElementById('projectsList');
    projectsList.innerHTML = '';

    projects.forEach(project => {
        const div = document.createElement('div');
        div.className = 'project-item';
        div.innerHTML = `
            <span class="project-item-name">${escapeHtml(project.name)}</span>
            <button class="delete-project" onclick="deleteProject(event, ${project.id})">🗑️</button>
        `;
        div.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-project')) {
                selectProject(project.id, project.name);
            }
        });
        projectsList.appendChild(div);
    });
}

async function addProject() {
    const name = document.getElementById('projectName').value.trim();
    if (!name) return;

    const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });

    if (response.ok) {
        document.getElementById('projectName').value = '';
        loadProjects();
    } else {
        const data = await response.json();
        alert(data.error || 'שגיאה בהוספת הפרוייקט');
    }
}

async function deleteProject(event, projectId) {
    event.stopPropagation();
    if (confirm('בטוח שברצונך למחוק את הפרוייקט וכל המשימות שלו?')) {
        await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
        if (currentProjectId === projectId) {
            currentProjectId = null;
            showNoProject();
        }
        loadProjects();
    }
}

function selectProject(projectId, projectName) {
    currentProjectId = projectId;
    document.querySelectorAll('.project-item').forEach(item => item.classList.remove('active'));
    event.currentTarget.classList.add('active');

    document.getElementById('projectTitle').textContent = escapeHtml(projectName);
    document.getElementById('noProject').style.display = 'none';
    document.getElementById('projectContent').style.display = 'block';

    document.getElementById('taskTitle').value = '';
    document.getElementById('taskDescription').value = '';
    loadTasks();
}

function showNoProject() {
    document.getElementById('noProject').style.display = 'flex';
    document.getElementById('projectContent').style.display = 'none';
}

async function loadTasks() {
    if (!currentProjectId) return;

    const response = await fetch(`/api/projects/${currentProjectId}/tasks`);
    const tasks = await response.json();
    const tasksList = document.getElementById('tasksList');
    tasksList.innerHTML = '';

    tasks.forEach(task => {
        const div = document.createElement('div');
        div.className = 'task-item' + (task.completed ? ' completed' : '');
        div.innerHTML = `
            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}
                   onchange="toggleTask(${task.id})">
            <div class="task-content">
                <div class="task-title">${escapeHtml(task.title)}</div>
                ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
            </div>
            <div class="task-actions">
                <button class="task-btn edit" onclick="editTask(${task.id}, '${escapeJs(task.title)}', '${escapeJs(task.description || '')}')">✏️</button>
                <button class="task-btn delete" onclick="deleteTask(${task.id})">🗑️</button>
            </div>
        `;
        tasksList.appendChild(div);
    });
}

async function addTask() {
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();

    if (!title || !currentProjectId) return;

    const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: currentProjectId, title, description })
    });

    if (response.ok) {
        document.getElementById('taskTitle').value = '';
        document.getElementById('taskDescription').value = '';
        loadTasks();
    }
}

async function toggleTask(taskId) {
    await fetch(`/api/tasks/${taskId}/toggle`, { method: 'PUT' });
    loadTasks();
}

async function deleteTask(taskId) {
    if (confirm('בטוח שברצונך למחוק את המשימה?')) {
        await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
        loadTasks();
    }
}

function editTask(taskId, title, description) {
    const newTitle = prompt('עדכן כותרת:', title);
    if (newTitle === null) return;

    const newDescription = prompt('עדכן תיאור:', description);
    if (newDescription === null) return;

    fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, description: newDescription })
    }).then(() => loadTasks());
}

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

function escapeJs(text) {
    return text.replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, '\\n');
}
