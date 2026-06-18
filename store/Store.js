// ===== Store contract =====
// The stable, async data-access interface the UI talks to instead of touching
// localStorage / FSSync directly. Every method returns a Promise so the SAME
// call sites work whether the backend is the local JSON file (LocalJsonStore)
// or a future HTTP/REST server (HttpStore) — flipping window.APP_CONFIG.backend
// is the only change needed to move to a server.
//
// Entity stores (tasks/projects/columns/taskTypes) expose:
//   list(query?)        -> Promise<T[]>
//   get(id)             -> Promise<T|null>
//   create(data)        -> Promise<T>     // backend assigns id + timestamps + owner
//   update(id, patch)   -> Promise<T|null>// partial field patch; bumps updatedAt
//   remove(id)          -> Promise<void>  // tasks: throws PermissionError if not owner
//
// The root store exposes lifecycle:
//   init()              -> Promise<void>  // connect / initial pull
//   refresh()           -> Promise<void>  // re-pull remote into local view
//
// This file only defines the shared error type; the concrete contract lives in
// LocalJsonStore (today) and HttpStore (future), both kept method-compatible.

class PermissionError extends Error {
    constructor(message) {
        super(message || 'permission denied');
        this.name = 'PermissionError';
    }
}
