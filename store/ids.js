// ===== Stable client identity + collision-free numeric IDs =====
// Loaded before fsSync.js / script.js as a plain global script.
// These helpers let several people edit the same shared JSON file without
// id collisions, and give every browser a stable owner id for task ownership.

const ID_CLIENT_KEY = 'tb_client_id';

// A stable identifier. Generated once and persisted in localStorage. Used
// as the owner id for tasks (createdById) so ownership survives
// display-name changes, and as the basis for "who am I" checks.
// When a real HTTP backend arrives this is replaced by the authenticated
// user id with no call-site change.
function getClientId() {
    let id = localStorage.getItem(ID_CLIENT_KEY);
    if (!id) {
        id = 'c' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36);
        localStorage.setItem(ID_CLIENT_KEY, id);
    }
    return id;
}

// When running as a Chrome extension with the "storage" permission,
// chrome.storage.sync is shared across every Chrome install signed into the
// same Google account (different profiles/channels on the same computer
// included). On first run after install we reconcile the local id with the
// synced one so "who am I" stays consistent across those installs, instead
// of each one generating its own random id. Falls back to the existing
// per-browser localStorage id when running as a plain page or when sync is
// unavailable. Must be awaited before any code calls getClientId().
async function syncClientId() {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) return;
    try {
        const stored = await chrome.storage.sync.get(ID_CLIENT_KEY);
        if (stored && stored[ID_CLIENT_KEY]) {
            localStorage.setItem(ID_CLIENT_KEY, stored[ID_CLIENT_KEY]);
        } else {
            await chrome.storage.sync.set({ [ID_CLIENT_KEY]: getClientId() });
        }
    } catch (e) {
        // sync unavailable (e.g. not signed in) — keep the local id
    }
}

// Collision-free numeric id (positive 53-bit safe integer). High-entropy
// randomness makes ids practically unique across clients editing the shared
// file offline (birthday collision is negligible for any realistic dataset).
// Stays NUMERIC on purpose so existing inline onclick handlers and `===`
// comparisons keep working unchanged.
function newId() {
    let rand;
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        rand = crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000;
    } else {
        rand = Math.random();
    }
    // Number.MAX_SAFE_INTEGER ≈ 9.007e15; keep well inside it. +1 avoids 0 (falsy).
    return Math.floor(rand * 9e15) + 1;
}

// Like newId() but guaranteed not to clash with any id already in `existing`
// (array or Set of ids). Cheap insurance against the astronomically unlikely
// duplicate at creation time.
function newUniqueId(existing) {
    const set = existing instanceof Set ? existing : new Set(existing);
    let id = newId();
    while (set.has(id)) id = newId();
    return id;
}
