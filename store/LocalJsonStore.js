// ===== LocalJsonStore =====
// Local backend for the Store contract. Wraps the existing localStorage helpers
// (getAllTasks/saveTasks/...) and the shared-file sync (FSSync). All methods are
// async even though localStorage is synchronous — that is what makes this
// interchangeable with a future HttpStore at zero call-site cost.
//
// Note: the getter/setter closures below reference globals defined later in
// script.js. They are only *invoked* at call time (after load), so referencing
// them here at construction is safe.

// Generic store for collections without per-record ownership
// (projects, columns, task types).
class LocalCollectionStore {
    constructor(read, write) {
        this._read = read;   // () => Array
        this._write = write; // (Array) => void
    }
    async list() { return this._read(); }
    async get(id) { return this._read().find(x => x.id === id) || null; }
    async create(data) {
        const items = this._read();
        const now = new Date().toISOString();
        const item = { ...data };
        if (item.id === undefined) item.id = newUniqueId(items.map(i => i.id));
        if (!item.createdAt) item.createdAt = now;
        item.updatedAt = now;
        items.push(item);
        this._write(items);
        return item;
    }
    async update(id, patch) {
        const items = this._read();
        const item = items.find(x => x.id === id);
        if (!item) return null;
        Object.assign(item, patch, { updatedAt: new Date().toISOString() });
        this._write(items);
        return item;
    }
    async remove(id) {
        const items = this._read();
        this._write(items.filter(x => x.id !== id));
    }
}

// Task store: adds stable ownership (createdById), tombstones on delete, and
// creator-only delete enforcement.
class LocalTaskStore {
    async list({ projectId } = {}) {
        const all = getAllTasks();
        return projectId === undefined ? all : all.filter(t => t.projectId === projectId);
    }
    async get(id) { return getAllTasks().find(t => t.id === id) || null; }
    async create(data) {
        const tasks = getAllTasks();
        const user = getUser();
        const now = new Date().toISOString();
        const task = {
            comments: 0,
            attachments: 0,
            ...data,
            id: newUniqueId(tasks.map(t => t.id)),
            createdAt: now,
            updatedAt: now,
            createdBy: user.name,
            createdById: user.id
        };
        tasks.push(task);
        saveTasks(tasks);
        return task;
    }
    async update(id, patch) {
        const tasks = getAllTasks();
        const task = tasks.find(t => t.id === id);
        if (!task) return null;
        Object.assign(task, patch, { updatedAt: new Date().toISOString() });
        saveTasks(tasks);
        return task;
    }
    async remove(id) {
        const tasks = getAllTasks();
        const task = tasks.find(t => t.id === id);
        if (!task) return;
        if (!this.canDelete(task)) {
            throw new PermissionError('only the creator can delete this task');
        }
        saveTasks(tasks.filter(t => t.id !== id));
        if (window.FSSync) FSSync.recordTombstone(id);
    }
    // Single source of truth for the ownership rule. The UI reuses this to
    // show/hide the delete button; the server will enforce the same rule as 403.
    canDelete(task, user = getUser()) {
        if (String(task.assigneeId) === String(user.id)) return true;
        if (task.assignee && task.assignee === user.name) return true;
        if (task.createdById) return task.createdById === user.id;
        // Legacy tasks with no stable owner stay deletable by anyone.
        return !task.createdBy || task.createdBy === 'unknown' || task.createdBy === user.name;
    }
}

class LocalJsonStore {
    constructor() {
        this.tasks = new LocalTaskStore();
        this.projects = new LocalCollectionStore(() => getProjects(), v => saveProjects(v));
        this.columns = new LocalCollectionStore(() => getColumns(), v => saveColumns(v));
        this.taskTypes = new LocalCollectionStore(() => getTaskTypes(), v => saveTaskTypes(v));
    }
    async init() {
        if (window.FSSync) await FSSync.init();
    }
    async refresh() {
        if (window.FSSync) await FSSync.pullRemote();
    }
}
