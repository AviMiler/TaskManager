// ===== HttpStore (future backend — spec/stub) =====
// Method-compatible with LocalJsonStore so moving the app to a server is a
// one-line switch in store/index.js. The server takes over the two
// responsibilities the local store handles today: assigning ids and enforcing
// creator-only deletes (returning 403 -> surfaced here as PermissionError).
//
// Not wired by default. Activate via:
//   window.APP_CONFIG = { backend: 'http', apiBaseUrl: '/api' };

class HttpEntityStore {
    constructor(baseUrl, resource) {
        this.base = `${baseUrl}/${resource}`;
    }
    async _json(res) {
        if (res.status === 403) throw new PermissionError('forbidden');
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.status === 204 ? null : res.json();
    }
    async list(query = {}) {
        const qs = new URLSearchParams(
            Object.entries(query).filter(([, v]) => v !== undefined && v !== null)
        ).toString();
        return this._json(await fetch(qs ? `${this.base}?${qs}` : this.base));
    }
    async get(id) {
        const res = await fetch(`${this.base}/${id}`);
        if (res.status === 404) return null;
        return this._json(res);
    }
    async create(data) {
        return this._json(await fetch(this.base, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }));
    }
    async update(id, patch) {
        return this._json(await fetch(`${this.base}/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch)
        }));
    }
    async remove(id) {
        await this._json(await fetch(`${this.base}/${id}`, { method: 'DELETE' }));
    }
}

class HttpStore {
    constructor(baseUrl) {
        const base = (baseUrl || '/api').replace(/\/$/, '');
        this.tasks = new HttpEntityStore(base, 'tasks');
        this.projects = new HttpEntityStore(base, 'projects');
        this.columns = new HttpEntityStore(base, 'columns');
        this.taskTypes = new HttpEntityStore(base, 'task-types');
    }
    async init() { /* e.g. open an SSE/WebSocket subscription feeding onChange */ }
    async refresh() { /* server is the source of truth; could re-fetch lists */ }
}
