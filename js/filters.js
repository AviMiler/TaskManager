// ===== Filter + Sort =====
function applyFiltersAndSort(tasks) {
    let out = tasks.slice();

    if (tasksMineOnly) out = out.filter(t => isMine(t, { includeAssignee: true }));
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
            <button class="mine-only-toggle ${tasksMineOnly ? 'active' : ''}" type="button" role="switch" aria-checked="${tasksMineOnly}" data-action="toggleTasksMineOnly()">
                <span class="mine-only-switch"></span>
                <span class="mine-only-label">הצג רק את המשימות שלי</span>
            </button>
        </div>
        <div class="popover-section">
            <div class="popover-label">תעדוף</div>
            <div class="popover-row">
                ${['high', 'med', 'low'].map(p => `
                    <button class="popover-chip ${activeFilters.priority === p ? 'active' : ''}" type="button" data-action="setFilter('priority', '${p}')">
                        ${p === 'high' ? 'גבוה' : p === 'med' ? 'בינוני' : 'נמוך'}
                    </button>
                `).join('')}
            </div>
        </div>
        ${tags.length ? `
            <div class="popover-section">
                <div class="popover-label">תגית</div>
                <div class="popover-row">
                    ${tags.map(tag => `<button class="popover-chip ${activeFilters.tag === tag ? 'active' : ''}" type="button" data-action="setFilter('tag', '${escapeAttr(tag)}')">${tag}</button>`).join('')}
                </div>
            </div>
        ` : ''}
        ${assignees.length ? `
            <div class="popover-section">
                <div class="popover-label">אחראי</div>
                <div class="popover-row">
                    ${assignees.map(a => `<button class="popover-chip ${activeFilters.assignee === a ? 'active' : ''}" type="button" data-action="setFilter('assignee', '${escapeAttr(a)}')">${a}</button>`).join('')}
                </div>
            </div>
        ` : ''}
        <div class="popover-footer">
            <button class="btn-secondary" type="button" data-action="clearFilters()">נקה הכל</button>
            <button class="btn-primary" type="button" data-action="closePopovers()">סגור</button>
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
                <button class="popover-menu-item ${activeSort === k ? 'active' : ''}" type="button" data-action="setSort('${k}')">
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
    const active = Object.values(activeFilters).filter(Boolean).length + (tasksMineOnly ? 1 : 0);
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
