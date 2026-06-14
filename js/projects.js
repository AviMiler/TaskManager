// ===== Workspace (team) =====
// The workspace represents the team that owns all the data shown in the app.
// For now it is a single editable name; later this will grow into a hierarchy
// of teams (a team aggregating several sub-teams, up to org level).
function getWorkspace() {
    const name = localStorage.getItem(DB.workspace);
    return {
        name: name && name.trim() ? name : 'Workspace',
        updatedAt: localStorage.getItem(DB.workspaceUpdatedAt) || null
    };
}

function saveWorkspace(name, updatedAt) {
    name = (name || '').trim();
    if (name) localStorage.setItem(DB.workspace, name);
    else localStorage.removeItem(DB.workspace);
    localStorage.setItem(DB.workspaceUpdatedAt, updatedAt || new Date().toISOString());
    renderWorkspaceUI();
    if (window.FSSync) FSSync.scheduleSave();
}

function renderWorkspaceUI() {
    const el = document.getElementById('workspaceName');
    if (el) el.textContent = getWorkspace().name;
}

async function editWorkspaceName() {
    const current = getWorkspace().name;
    const name = await showPrompt('שם הצוות / workspace', current === 'Workspace' ? '' : current, 'שם הצוות');
    if (name === null) return;
    saveWorkspace(name);
}

// Collapse/expand a sidebar section (פרטי פרויקט / חברים בפרויקט).
function toggleSidebarSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    const collapsed = section.classList.toggle('collapsed');
    const header = section.querySelector('.sidebar-section-header');
    if (header) header.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
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

    const user = getUser();
    const project = await store.projects.create({
        name: escapeHtml(name),
        hueIdx: projects.length % HUES.length,
        createdBy: user.name,
        createdById: user.id,
        ownerId: user.id,
        memberIds: [user.id]
    });
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
        <div class="modal" data-action="event.stopPropagation()" style="max-width: 480px;">
            <div class="modal-header">
                <h2 class="modal-title">הגדרות פרויקט</h2>
                <button class="modal-close" type="button" aria-label="סגור" data-action="closeProjectSettings()">×</button>
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
                <div class="field">
                    <label class="field-label">שייך ל</label>
                    <select id="projectOwner" class="field-select">
                        ${(() => {
                            const ownerId = project.ownerId ?? project.createdById;
                            return getMembers().slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'he'))
                                .map(m => `<option value="${m.id}" ${String(ownerId) === String(m.id) ? 'selected' : ''}>${escapeHtml(m.name)}</option>`)
                                .join('');
                        })()}
                    </select>
                </div>
                <div class="field">
                    <label class="field-label">חברי הפרויקט</label>
                    <div id="projectMembersList"></div>
                    <div style="display:flex; gap:6px; margin-top:6px;">
                        <select id="projectAddMemberSelect" class="field-select"></select>
                        <button class="btn-secondary" type="button" id="projectAddMemberBtn">הוסף</button>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" data-action="closeProjectSettings()">ביטול</button>
                <button class="btn-primary" data-action="saveProjectSettings(${id})">שמור</button>
            </div>
        </div>
    `;

    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeProjectSettings(); });
    document.body.appendChild(overlay);

    // Wire up color swatch clicks
    overlay.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.addEventListener('click', function() {
            overlay.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
            this.classList.add('selected');
        });
    });

    // ===== Project members (staged) =====
    const me = getUser();
    const defaultOwnerId = project.ownerId ?? project.createdById;
    let memberIds = (Array.isArray(project.memberIds) && project.memberIds.length)
        ? project.memberIds.map(String)
        : [defaultOwnerId, me.id].filter(Boolean).map(String);
    memberIds = [...new Set(memberIds)];
    overlay._getMemberIds = () => memberIds;

    const membersListEl = overlay.querySelector('#projectMembersList');
    const addSelectEl = overlay.querySelector('#projectAddMemberSelect');
    const addBtnEl = overlay.querySelector('#projectAddMemberBtn');

    const renderMembers = () => {
        const allMembers = getMembers();
        membersListEl.innerHTML = memberIds.map(mid => {
            const m = allMembers.find(x => String(x.id) === mid);
            const name = m ? m.name : mid;
            const ini = initials(name) || (name || '').substring(0, 2);
            const isMe = mid === String(me.id);
            return `
            <div class="team-row" data-member-id="${escapeAttr(mid)}">
                <div class="avatar avatar-sm" style="--hue:${m ? m.hue : 200};">${escapeHtml(ini)}</div>
                <span class="user-name">${escapeHtml(name)}${isMe ? ' <span class="team-me-badge">אני</span>' : ''}</span>
                <button class="manage-type-delete" type="button" data-remove-member="${escapeAttr(mid)}" aria-label="הסר">×</button>
            </div>`;
        }).join('');

        membersListEl.querySelectorAll('[data-remove-member]').forEach(btn => {
            btn.addEventListener('click', () => {
                memberIds = memberIds.filter(mid => mid !== btn.dataset.removeMember);
                renderMembers();
            });
        });

        // Only people who have registered themselves can be added to a project —
        // there is no inline person creation. When everyone is already a member
        // (or nobody has registered yet) the picker shows a disabled hint.
        const available = allMembers.filter(m => !memberIds.includes(String(m.id)))
            .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'he'));
        if (available.length) {
            addSelectEl.innerHTML = available.map(m => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('');
            addSelectEl.disabled = false;
            addBtnEl.disabled = false;
        } else {
            addSelectEl.innerHTML = '<option value="">אין אנשים זמינים — כל אחד מצטרף בעצמו דרך כניסה עם ת"ז</option>';
            addSelectEl.disabled = true;
            addBtnEl.disabled = true;
        }
    };

    addBtnEl.addEventListener('click', () => {
        const val = addSelectEl.value;
        if (!val) return;
        if (!memberIds.includes(val)) memberIds.push(val);
        renderMembers();
    });

    renderMembers();
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
    const ownerId = document.getElementById('projectOwner').value;
    const overlay = document.getElementById('projectSettingsModal');
    const memberIds = overlay && overlay._getMemberIds ? overlay._getMemberIds() : null;

    const projects = getProjects();
    const project = projects.find(p => p.id === id);
    if (!project) return;

    project.name = escapeHtml(name);
    project.description = escapeHtml(description);
    project.status = status;
    project.hueIdx = hueIdx;
    project.ownerId = ownerId;
    if (memberIds) project.memberIds = memberIds;
    // Bump the timestamp so file-sync's merge-by-updatedAt keeps this edit
    // instead of letting an older remote copy overwrite it on the next pull.
    project.updatedAt = new Date().toISOString();

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
    const allProjects = getProjects();
    const projects = showMineOnly ? allProjects.filter(p => isMine(p)) : allProjects;

    const toggle = document.getElementById('mineOnlyToggle');
    if (toggle) {
        toggle.classList.toggle('active', showMineOnly);
        toggle.setAttribute('aria-checked', showMineOnly ? 'true' : 'false');
    }

    list.innerHTML = '';

    if (projects.length === 0) {
        const msg = showMineOnly && allProjects.length
            ? 'אינך חבר באף פרויקט — בטל את "הצג רק שלי" כדי לראות הכל'
            : 'אין פרויקטים עדיין';
        list.innerHTML = `<div style="padding: 12px; text-align: center; color: var(--ink-f); font-size: 12px;">${msg}</div>`;
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
                <button class="project-delete-btn" data-action="deleteProject(${p.id}, event)" title="מחק">×</button>
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
    const nameEl = document.getElementById('currentProjectName');
    if (!btn || !dot || !nameEl) return;

    if (currentProjectId) {
        const project = getProjects().find(p => p.id === currentProjectId);
        if (project) {
            const hue = HUES[project.hueIdx || 0];
            dot.style.setProperty('--hue', hue);
            dot.style.background = `oklch(0.72 0.12 ${hue})`;
            nameEl.innerHTML = project.name;
            return;
        }
    }
    dot.style.background = 'var(--line-h)';
    nameEl.textContent = 'בחר פרויקט';
}

function renderProjectMembers(project) {
    const body = document.getElementById('projectMembersBody');
    if (!body) return;
    if (!project) {
        body.innerHTML = '<div class="project-details-empty">—</div>';
        return;
    }

    const allMembers = getMembers();
    const ownerId = String(project.ownerId ?? project.createdById ?? '');
    let memberIds = (Array.isArray(project.memberIds) && project.memberIds.length)
        ? project.memberIds.map(String)
        : [ownerId].filter(Boolean);
    memberIds = [...new Set(memberIds)];

    if (!memberIds.length) {
        body.innerHTML = '<div class="project-details-empty">אין חברים בפרויקט</div>';
        return;
    }

    const me = getUser();
    body.innerHTML = memberIds.map(mid => {
        const m = allMembers.find(x => String(x.id) === mid);
        const name = m ? m.name : mid;
        const ini = initials(name) || (name || '').substring(0, 2);
        const isOwner = mid === ownerId;
        const isMe = mid === String(me.id);
        return `
        <div class="project-member-row">
            <div class="avatar avatar-sm" style="--hue:${m ? m.hue : 200};">${escapeHtml(ini)}</div>
            <span class="project-member-name">${escapeHtml(name)}</span>
            ${isMe ? '<span class="team-me-badge">אני</span>' : ''}
            ${isOwner ? '<span class="project-member-owner">בעלים</span>' : ''}
        </div>`;
    }).join('');
}

function renderProjectDetails() {
    const panel = document.getElementById('projectDetails');
    const infoBody = document.getElementById('projectInfoBody');
    if (!panel) return;

    const project = currentProjectId ? getProjects().find(p => p.id === currentProjectId) : null;

    if (!project) {
        if (infoBody) infoBody.innerHTML = '<div class="project-details-empty">בחר פרויקט להצגת פרטים</div>';
        renderProjectMembers(null);
        panel.innerHTML = '<div class="project-details-empty">בחר פרויקט להצגת פרטים</div>';
        return;
    }

    const hue = HUES[project.hueIdx || 0];
    const tasks = getTasks(project.id);
    const cols = getColumns();
    const createdDate = new Date(project.createdAt).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });

    // ===== Section 1: project info (description + meta) =====
    if (infoBody) {
        const descHtml = project.description
            ? `<div class="project-info-desc">${project.description}</div>`
            : '<div class="project-info-desc project-info-desc-empty">אין תיאור</div>';
        infoBody.innerHTML = `
            ${descHtml}
            <div class="project-details-meta">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span>נוצר ${createdDate}${project.createdBy ? ` ע״י ${escapeHtml(project.createdBy)}` : ''}</span>
            </div>
            <button class="project-info-settings-btn" type="button" data-action="openProjectSettings(${project.id}, event)">
                ${ICONS.pencil}<span>הגדרות פרויקט</span>
            </button>
        `;
    }

    // ===== Section 2: members =====
    renderProjectMembers(project);

    // ===== Section 3 (everything else): stats by stage + links =====
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
        <div class="project-link-btn" data-link-id="${l.id}" title="${escapeAttr(l.url.startsWith('[#VSC#]') ? l.url.replace('[#VSC#]', '') : l.url)}">
            <span class="project-link-icon">${renderLinkIcon(l.icon)}</span>
            <span class="project-link-name">${l.name}</span>
            <button class="project-link-edit" type="button" data-edit-link="${l.id}" aria-label="ערוך">✎</button>
            <button class="project-link-del" type="button" data-del-link="${l.id}" aria-label="מחק">×</button>
        </div>
    `).join('');

    panel.innerHTML = `
        <div class="project-details-body" style="--hue: ${hue};">
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
                if (link.url.startsWith('[#VSC#]')) {
                    const path = link.url.replace('[#VSC#]', '').replace(/\\/g, '/');
                    window.location.href = 'vscode://file/' + path;
                } else if (link.url.startsWith('file:')) {
                    // Page context can't navigate to file:// (browser-blocked).
                    // Hand it to the extension service worker, which opens it
                    // via chrome.tabs.create. Falls back to window.open when not
                    // running as an extension (e.g. plain web/file:// hosting).
                    if (window.chrome && chrome.runtime && chrome.runtime.sendMessage) {
                        chrome.runtime.sendMessage({ type: 'openLocalFile', url: link.url });
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
