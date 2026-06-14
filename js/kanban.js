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
                    ${formatDueDate(task.due).display}
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
    // Persist the new order as a per-record field + bump updatedAt so the
    // shared-file merge (last-write-wins) keeps it instead of reverting to the
    // remote array order.
    const now = new Date().toISOString();
    columns.forEach((c, i) => { c.order = i; c.updatedAt = now; });
    saveColumns(columns);
    renderKanban();
}
