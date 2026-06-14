// ===== Shared-file sync via File System Access API =====
// Lets multiple users point at the same JSON file on a shared drive.
// Only works in Chromium browsers (Chrome/Edge). Falls back silently to
// localStorage-only mode everywhere else.

const FS_DB_NAME = 'tb_fs_sync';
const FS_STORE = 'handles';
const FS_HANDLE_KEY = 'sharedFile';
const FS_TOMBSTONE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const FS_SCHEMA_VERSION = 2;        // shared-file envelope version (see pushLocal)
const FS_PUSH_MAX_ATTEMPTS = 3;     // optimistic-concurrency retries on write

function idbOpen() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(FS_DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(FS_STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function idbGetHandle() {
    try {
        const db = await idbOpen();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(FS_STORE, 'readonly');
            const req = tx.objectStore(FS_STORE).get(FS_HANDLE_KEY);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        return null;
    }
}

async function idbSetHandle(handle) {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(FS_STORE, 'readwrite');
        tx.objectStore(FS_STORE).put(handle, FS_HANDLE_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function idbDeleteHandle() {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(FS_STORE, 'readwrite');
        tx.objectStore(FS_STORE).delete(FS_HANDLE_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

// Merge two arrays of records by `id`, preferring the record with the
// newer updatedAt/createdAt timestamp when both sides have one.
function mergeById(base, other, tombstones) {
    const map = new Map();
    base.forEach(item => map.set(item.id, item));
    other.forEach(item => {
        const existing = map.get(item.id);
        if (!existing) { map.set(item.id, item); return; }
        const eu = existing.updatedAt || existing.createdAt || 0;
        const ou = item.updatedAt || item.createdAt || 0;
        if (new Date(ou) > new Date(eu)) map.set(item.id, item);
    });
    let result = Array.from(map.values());
    if (tombstones && tombstones.length) {
        const tmap = new Map(tombstones.map(t => [t.id, t.deletedAt]));
        result = result.filter(item => {
            const delAt = tmap.get(item.id);
            if (!delAt) return true;
            const updated = item.updatedAt || item.createdAt;
            return updated && new Date(updated) > new Date(delAt);
        });
    }
    return result;
}

function mergeTombstones(a, b) {
    const map = new Map();
    [...a, ...b].forEach(t => {
        const existing = map.get(t.id);
        if (!existing || new Date(t.deletedAt) > new Date(existing.deletedAt)) map.set(t.id, t);
    });
    const cutoff = Date.now() - FS_TOMBSTONE_MAX_AGE_MS;
    return Array.from(map.values()).filter(t => new Date(t.deletedAt).getTime() > cutoff);
}

const FSSync = {
    fileHandle: null,
    status: 'disconnected', // 'disconnected' | 'connected' | 'unsupported' | 'error'
    saveTimer: null,
    saving: false,
    pendingTombstones: [],
    pendingMemberTombstones: [],
    pollTimer: null,
    lastSeenMtime: 0,
    boundOnVisible: null,

    isSupported() {
        return typeof window.showOpenFilePicker === 'function';
    },

    getStatusLabel() {
        switch (this.status) {
            case 'connected': return 'מחובר לקובץ משותף ✓';
            case 'error': return 'לחץ להתחברות מחדש לקובץ המשותף';
            case 'unsupported': return 'תכונה זו זמינה רק ב-Chrome/Edge';
            default: return 'התחבר לקובץ משותף';
        }
    },

    async init() {
        if (!this.isSupported()) {
            this.status = 'unsupported';
            return;
        }
        const handle = await idbGetHandle();
        if (!handle) {
            this.status = 'disconnected';
            return;
        }
        this.fileHandle = handle;
        const granted = await this.verifyPermission(handle, false);
        if (!granted) {
            this.status = 'error';
            return;
        }
        this.status = 'connected';
        await this.pullRemote();
        this.startAutoSync();
    },

    async verifyPermission(handle, requestIfNeeded) {
        const opts = { mode: 'readwrite' };
        if ((await handle.queryPermission(opts)) === 'granted') return true;
        if (requestIfNeeded) {
            if ((await handle.requestPermission(opts)) === 'granted') return true;
        }
        return false;
    },

    async connect() {
        if (!this.isSupported()) return;
        try {
            // Reconnect existing handle (e.g. permission was revoked / lost on reload)
            if (this.fileHandle) {
                const granted = await this.verifyPermission(this.fileHandle, true);
                if (granted) {
                    this.status = 'connected';
                    await this.pullRemote();
                    await this.pushLocal();
                    this.startAutoSync();
                    renderSyncStatusUI();
                    closePopovers();
                    return;
                }
            }

            let handle;
            try {
                [handle] = await window.showOpenFilePicker({
                    types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
                    excludeAcceptAllOption: false
                });
            } catch (e) {
                if (e.name === 'AbortError') return; // user cancelled, no error
                throw e;
            }

            const granted = await this.verifyPermission(handle, true);
            if (!granted) {
                this.status = 'error';
                renderSyncStatusUI();
                return;
            }

            this.fileHandle = handle;
            await idbSetHandle(handle);
            this.status = 'connected';
            await this.pullRemote();
            await this.pushLocal();
            this.startAutoSync();
            renderSyncStatusUI();
            closePopovers();
            await showAlert('חובר בהצלחה לקובץ המשותף');
        } catch (e) {
            console.error('FSSync.connect', e);
            this.status = 'error';
            renderSyncStatusUI();
            await showAlert('שגיאה בהתחברות לקובץ המשותף');
        }
    },

    supportsSavePicker() {
        return typeof window.showSaveFilePicker === 'function';
    },

    // Let the user choose WHERE the shared file lives (folder + name) and
    // create it there, seeding it with the current local data. Picking an
    // existing file is safe too: pushLocal reads-merges-writes, so its
    // contents are merged in rather than blindly overwritten.
    async createNew() {
        if (!this.supportsSavePicker()) return;
        try {
            let handle;
            try {
                handle = await window.showSaveFilePicker({
                    suggestedName: 'taskboard-shared.json',
                    types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
                });
            } catch (e) {
                if (e.name === 'AbortError') return; // user cancelled, no error
                throw e;
            }

            const granted = await this.verifyPermission(handle, true);
            if (!granted) {
                this.status = 'error';
                renderSyncStatusUI();
                return;
            }

            this.fileHandle = handle;
            await idbSetHandle(handle);
            this.status = 'connected';
            await this.pushLocal();   // write current data into the chosen location
            this.startAutoSync();
            renderSyncStatusUI();
            closePopovers();
            await showAlert('נבחר מיקום והקובץ המשותף מוכן. שתף את הקובץ עם שאר הצוות.');
        } catch (e) {
            console.error('FSSync.createNew', e);
            this.status = 'error';
            renderSyncStatusUI();
            await showAlert('שגיאה ביצירת קובץ משותף במיקום שנבחר');
        }
    },

    async disconnect() {
        this.stopAutoSync();
        this.fileHandle = null;
        this.status = 'disconnected';
        this.lastSeenMtime = 0;
        await idbDeleteHandle();
        renderSyncStatusUI();
    },

    async readFile() {
        const granted = await this.verifyPermission(this.fileHandle, true);
        if (!granted) throw new Error('permission denied');
        const file = await this.fileHandle.getFile();
        this.lastSeenMtime = file.lastModified; // for auto-sync change detection
        const text = await file.text();
        if (!text.trim()) return null;
        return JSON.parse(text); // throws on invalid JSON - caller decides fallback
    },

    async writeFile(data) {
        const granted = await this.verifyPermission(this.fileHandle, true);
        if (!granted) throw new Error('permission denied');
        const writable = await this.fileHandle.createWritable();
        await writable.write(JSON.stringify(data, null, 2));
        await writable.close();
        // Record our own write's mtime so the poller doesn't re-pull it.
        try { this.lastSeenMtime = (await this.fileHandle.getFile()).lastModified; } catch (e) {}
    },

    scheduleSave() {
        if (!this.fileHandle || this.status === 'unsupported') return;
        clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => this.pushLocal(), 800);
    },

    recordTombstone(taskId) {
        this.pendingTombstones.push({ id: taskId, deletedAt: new Date().toISOString() });
        this.scheduleSave();
    },

    recordMemberTombstone(memberId) {
        this.pendingMemberTombstones.push({ id: memberId, deletedAt: new Date().toISOString() });
        this.scheduleSave();
    },

    // ===== Auto-sync: pick up other clients' changes without a reload =====
    FS_POLL_INTERVAL_MS: 4000,

    startAutoSync() {
        if (!this.fileHandle || this.status === 'unsupported') return;
        if (this.pollTimer) return; // already running
        this.pollTimer = setInterval(() => this.pullIfRemoteChanged(), this.FS_POLL_INTERVAL_MS);
        // Pull immediately when the tab regains focus / becomes visible, so
        // switching back to a window shows the latest without waiting a tick.
        this.boundOnVisible = () => {
            if (document.visibilityState === 'visible') this.pullIfRemoteChanged();
        };
        document.addEventListener('visibilitychange', this.boundOnVisible);
        window.addEventListener('focus', this.boundOnVisible);
    },

    stopAutoSync() {
        if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
        if (this.boundOnVisible) {
            document.removeEventListener('visibilitychange', this.boundOnVisible);
            window.removeEventListener('focus', this.boundOnVisible);
            this.boundOnVisible = null;
        }
    },

    // Cheap check: only parse + merge the shared file when its on-disk
    // modification time advanced past what we last read/wrote ourselves.
    async pullIfRemoteChanged() {
        if (!this.fileHandle || this.status === 'unsupported' || this.saving) return;
        let file;
        try {
            file = await this.fileHandle.getFile();
        } catch (e) {
            return; // permission/handle lost - leave it to explicit reconnect
        }
        if (this.lastSeenMtime && file.lastModified <= this.lastSeenMtime) return;
        await this.pullRemote();
    },

    async pullRemote() {
        if (!this.fileHandle) return;
        let remote;
        try {
            remote = await this.readFile();
        } catch (e) {
            console.error('FSSync.pullRemote', e);
            this.status = 'error';
            renderSyncStatusUI();
            return;
        }
        if (!remote) return; // empty shared file - nothing to merge yet

        const tombstones = remote.tombstones || [];
        const memberTombstones = remote.memberTombstones || [];

        localStorage.setItem(DB.tasks, JSON.stringify(mergeById(getAllTasks(), remote.tasks || [], tombstones)));
        localStorage.setItem(DB.projects, JSON.stringify(mergeById(getProjects(), remote.projects || [])));
        localStorage.setItem(DB.columns, JSON.stringify(mergeById(getColumns(), remote.columns || [])));
        localStorage.setItem(DB.taskTypes, JSON.stringify(mergeById(getTaskTypes(), remote.taskTypes || [])));
        localStorage.setItem(DB.members, JSON.stringify(mergeById(getMembers(), remote.members || [], memberTombstones)));

        loadProjects();
        rerenderCurrentView();
        this.status = 'connected';
        renderSyncStatusUI();
    },

    async pushLocal() {
        if (!this.fileHandle || this.saving) return;
        this.saving = true;
        try {
            let merged = null;

            for (let attempt = 1; attempt <= FS_PUSH_MAX_ATTEMPTS; attempt++) {
                let remote = null;
                try { remote = await this.readFile(); } catch (e) { /* missing/invalid - overwrite */ }
                remote = remote || {};
                const baseGen = remote.generation || 0;

                const tombstones = mergeTombstones(remote.tombstones || [], this.pendingTombstones);
                const memberTombstones = mergeTombstones(remote.memberTombstones || [], this.pendingMemberTombstones);
                const mergedTasks = mergeById(remote.tasks || [], getAllTasks(), tombstones);
                const mergedProjects = mergeById(remote.projects || [], getProjects());
                const mergedColumns = mergeById(remote.columns || [], getColumns());
                const mergedTypes = mergeById(remote.taskTypes || [], getTaskTypes());
                const mergedMembers = mergeById(remote.members || [], getMembers(), memberTombstones);

                // Optimistic-concurrency guard: re-read right before writing.
                // If another client advanced `generation` since we read, redo
                // the merge against their version instead of clobbering it.
                // (The File System Access API offers no cross-process lock;
                // this narrows the race window. A true lock arrives with the
                // directory-handle work / the HTTP backend.)
                let check = null;
                try { check = await this.readFile(); } catch (e) { /* treat as unchanged */ }
                const currentGen = (check && check.generation) || 0;
                if (currentGen !== baseGen && attempt < FS_PUSH_MAX_ATTEMPTS) {
                    await new Promise(r => setTimeout(r, 50 + Math.random() * 150));
                    continue;
                }

                await this.writeFile({
                    schemaVersion: FS_SCHEMA_VERSION,
                    generation: baseGen + 1,
                    projects: mergedProjects,
                    tasks: mergedTasks,
                    columns: mergedColumns,
                    taskTypes: mergedTypes,
                    members: mergedMembers,
                    tombstones,
                    memberTombstones,
                    lastModified: new Date().toISOString(),
                    lastModifiedBy: getUser().name,
                    lastModifiedById: getUser().id
                });

                merged = { mergedTasks, mergedProjects, mergedColumns, mergedTypes, mergedMembers };
                break;
            }

            if (merged) {
                // Only clear pending tombstones once they are safely persisted.
                this.pendingTombstones = [];
                this.pendingMemberTombstones = [];
                localStorage.setItem(DB.tasks, JSON.stringify(merged.mergedTasks));
                localStorage.setItem(DB.projects, JSON.stringify(merged.mergedProjects));
                localStorage.setItem(DB.columns, JSON.stringify(merged.mergedColumns));
                localStorage.setItem(DB.taskTypes, JSON.stringify(merged.mergedTypes));
                localStorage.setItem(DB.members, JSON.stringify(merged.mergedMembers));
                loadProjects();
                rerenderCurrentView();
            }

            this.status = 'connected';
        } catch (e) {
            console.error('FSSync.pushLocal', e);
            this.status = 'error';
        } finally {
            this.saving = false;
            renderSyncStatusUI();
        }
    }
};

// Expose on window so the `if (window.FSSync)` guards and inline
// onclick="FSSync.connect()" handlers resolve it (a top-level `const` is a
// global lexical binding, not a property of window).
window.FSSync = FSSync;
