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
        <div class="modal" data-action="event.stopPropagation()">
            <div class="modal-header">
                <h2 class="modal-title">${isNew ? 'משימה חדשה' : 'עריכת משימה'}</h2>
                <button class="modal-close" type="button" aria-label="סגור" data-action="closeModal()">×</button>
            </div>
            ${!isNew && t.createdBy && t.createdBy !== 'unknown'
                ? `<div class="modal-creator">נוצר על ידי <strong>${t.createdBy}</strong></div>`
                : ''}
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
                        <select id="modalAssignee" class="field-select">
                            ${assigneeOptionsHtml(t.assigneeId)}
                        </select>
                    </div>
                    <div class="field">
                        <label class="field-label">תאריך יעד</label>
                        <input type="date" id="modalDueDate" class="field-input" value="${parseDueDate(t.due)}">
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                ${!isNew && canDeleteTask(t) ? `<button class="btn-danger" data-action="deleteTask(${t.id});">מחק</button>` : ''}
                <div style="margin-inline-start: auto; display: flex; gap: 8px;">
                    <button class="btn-secondary" data-action="closeModal()">ביטול</button>
                    <button class="btn-primary" data-action="saveTaskFromModal(${isNew ? 'null' : t.id})">${isNew ? 'צור משימה' : 'שמור'}</button>
                </div>
            </div>
        </div>
    `;

    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });

    // Assignee dropdown: support adding a new team member inline.
    const assigneeSel = overlay.querySelector('#modalAssignee');
    if (assigneeSel) {
        let lastValue = assigneeSel.value;
        assigneeSel.addEventListener('change', async () => {
            if (assigneeSel.value === '__add__') {
                const name = await showPrompt('שם איש הצוות החדש:', '', 'הוסף איש צוות');
                if (name && name.trim()) {
                    const m = addMember(name.trim());
                    assigneeSel.innerHTML = assigneeOptionsHtml(m.id);
                } else {
                    assigneeSel.value = lastValue;
                }
            }
            lastValue = assigneeSel.value;
        });
    }

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

    return { display, dueIn };
}

async function saveTaskFromModal(taskId) {
    const title = document.getElementById('modalTitle').value;
    if (!title.trim()) {
        await showAlert('כותרת חובה');
        return;
    }

    const isoDate = document.getElementById('modalDueDate').value;
    const dueInfo = formatDueDate(isoDate);

    const assigneeSel = document.getElementById('modalAssignee');
    const assigneeId = assigneeSel && assigneeSel.value && assigneeSel.value !== '__add__'
        ? assigneeSel.value : '';
    const assigneeName = assigneeId ? memberName(assigneeId) : '';

    const data = {
        title: title,
        description: document.getElementById('modalDescription').value,
        state: document.getElementById('modalState').value,
        priority: document.getElementById('modalPriority').value,
        tag: document.getElementById('modalTag').value,
        assignee: assigneeName,
        assigneeId: assigneeId || null,
        due: isoDate || '',
        dueIn: dueInfo.dueIn,
        taskType: document.getElementById('modalType').value,
    };

    if (taskId === null || taskId === undefined) {
        await addTask(data);
    } else {
        await updateTask(taskId, data);
    }

    closeModal();
}

function closeModal() {
    const m = document.getElementById('taskModal');
    if (m) m.remove();
    editingTaskId = null;
}
