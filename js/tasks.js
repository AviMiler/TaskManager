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

    // UI owns validation + escaping; the store assigns id/timestamps/owner.
    await store.tasks.create({
        projectId: currentProjectId,
        title: escapeHtml(data.title.trim()),
        description: escapeHtml((data.description || '').trim()),
        state: data.state || 'todo',
        priority: data.priority || 'med',
        tag: escapeHtml((data.tag || '').trim()),
        assignee: escapeHtml((data.assignee || '').trim()),
        assigneeId: data.assigneeId || null,
        due: escapeHtml((data.due || '').trim()),
        dueIn: data.dueIn !== undefined ? data.dueIn : null,
        taskType: data.taskType || ''
    });
    loadProjects();
    rerenderCurrentView();
}

async function updateTask(id, data) {
    // Build a partial patch of only the fields the caller supplied; the store
    // applies it and bumps updatedAt.
    const patch = {};
    if (data.title !== undefined) patch.title = escapeHtml(data.title.trim());
    if (data.description !== undefined) patch.description = escapeHtml(data.description.trim());
    if (data.state !== undefined) patch.state = data.state;
    if (data.priority !== undefined) patch.priority = data.priority;
    if (data.tag !== undefined) patch.tag = escapeHtml(data.tag.trim());
    if (data.assignee !== undefined) patch.assignee = escapeHtml(data.assignee.trim());
    if (data.assigneeId !== undefined) patch.assigneeId = data.assigneeId || null;
    if (data.due !== undefined) {
        patch.due = escapeHtml(data.due.trim());
        patch.dueIn = data.dueIn !== undefined ? data.dueIn : null;
    }
    if (data.taskType !== undefined) patch.taskType = data.taskType;

    const task = await store.tasks.update(id, patch);
    if (!task) return;
    loadProjects();
    rerenderCurrentView();
}

// Cosmetic helper for the UI (greys out the delete button). Enforcement lives
// in store.tasks.remove — this just reuses the same rule.
function canDeleteTask(task) {
    return store.tasks.canDelete(task);
}

async function deleteTask(id, event) {
    if (event) event.stopPropagation();
    const task = await store.tasks.get(id);
    if (!task) return;
    const ok = await showConfirm('למחוק את המשימה?', 'מחיקת משימה', 'מחק', 'ביטול');
    if (!ok) return;

    try {
        await store.tasks.remove(id);
    } catch (e) {
        if (e instanceof PermissionError) {
            await showAlert('ניתן למחוק רק משימות שיצרת בעצמך');
            return;
        }
        throw e;
    }
    loadProjects();
    rerenderCurrentView();
    closeModal();
}


function moveTask(id, newState) {
    updateTask(id, { state: newState });
}
