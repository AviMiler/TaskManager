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
            <div class="search-header" data-action="openSearchPage('${escapeAttr(term)}')" style="cursor: pointer; user-select: none;">${total} תוצאות</div>
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
            <button class="search-back-btn" type="button" data-action="closeSearchPage()">← חזרה</button>
            <span class="search-page-title">תוצאות עבור "<strong>${escapeHtml(searchPageTerm)}</strong>"</span>
            <span class="search-page-count">${matches.length} תוצאות</span>
        </div>
        ${showFilters ? `
        <div class="search-page-filters">
            ${projectsWithMatches.length > 1 ? `
                <span class="search-filter-label">פרויקט:</span>
                <div class="search-filter-chips">
                    ${projectsWithMatches.map(p => `
                        <button class="search-filter-chip ${searchPageFilters.projectId === p.id ? 'active' : ''}" type="button" data-action="setSearchFilter('projectId', ${p.id})">${p.name}</button>
                    `).join('')}
                </div>
            ` : ''}
            ${prioritiesInMatches.length > 1 ? `
                <span class="search-filter-label">תעדוף:</span>
                <div class="search-filter-chips">
                    ${prioritiesInMatches.map(pri => `
                        <button class="search-filter-chip ${searchPageFilters.priority === pri ? 'active' : ''}" type="button" data-action="setSearchFilter('priority', '${pri}')">${priLabels[pri] || pri}</button>
                    `).join('')}
                </div>
            ` : ''}
            ${statesInMatches.length > 1 ? `
                <span class="search-filter-label">מצב:</span>
                <div class="search-filter-chips">
                    ${statesInMatches.map(s => `
                        <button class="search-filter-chip ${searchPageFilters.state === s ? 'active' : ''}" type="button" data-action="setSearchFilter('state', '${s}')">${stateLabel(s)}</button>
                    `).join('')}
                </div>
            ` : ''}
            ${hasFilters ? `<button class="search-filter-clear" type="button" data-action="clearSearchFilters()">נקה הכל</button>` : ''}
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
                                    <button class="card-action-btn" type="button" aria-label="ערוך" data-action="openEditModalForTask(${t.id})">${ICONS.pencil}</button>
                                    ${canDeleteTask(t) ? `<button class="card-action-btn delete" type="button" aria-label="מחק" data-action="deleteTask(${t.id}, event)">×</button>` : ''}
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
