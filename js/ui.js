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
                <button class="list-scope-btn ${listScope === 'current' ? 'active' : ''}" data-scope="current" data-action="setListScope('current')" type="button">פרויקט נוכחי</button>
                <button class="list-scope-btn ${listScope === 'all' ? 'active' : ''}" data-scope="all" data-action="setListScope('all')" type="button">כל הפרויקטים</button>
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
                            <button class="card-action-btn" type="button" aria-label="ערוך" data-action="openEditModal(${t.id})">${ICONS.pencil}</button>
                            ${canDeleteTask(t) ? `<button class="card-action-btn delete" type="button" aria-label="מחק" data-action="deleteTask(${t.id}, event)">×</button>` : ''}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>`}
    `;
}
