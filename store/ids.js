// ===== Stable client identity + collision-free numeric IDs =====
// Loaded before fsSync.js / script.js as a plain global script.
// These helpers let several people edit the same shared JSON file without
// id collisions, and give every browser a stable owner id for task ownership.

const ID_IDENTITY_KEY = 'tb_identity';   // the national id (תעודת זהות) of whoever is logged in here
const ID_CLIENT_KEY = 'tb_client_id';    // legacy random per-browser id — read only for one-time migration

// "Who am I" = the national id the person typed when they logged in on this
// browser. Identity is portable: the same id on any browser is the same person.
// Returns null when nobody is logged in (the app then forces the login modal).
// This is NOT authentication — it only divides ownership/responsibility.
function getClientId() {
    return localStorage.getItem(ID_IDENTITY_KEY) || null;
}

function isLoggedIn() {
    return !!localStorage.getItem(ID_IDENTITY_KEY);
}

function setIdentity(nationalId) {
    if (nationalId) localStorage.setItem(ID_IDENTITY_KEY, String(nationalId));
}

function clearIdentity() {
    localStorage.removeItem(ID_IDENTITY_KEY);
}

// Best-effort: when running as a Chrome extension signed into a Google account,
// remember the logged-in national id across that account's installs so the
// person doesn't have to retype it. Push-only — never auto-pulls/auto-logs-in,
// so an explicit logout stays logged out. Must be awaited before getClientId().
async function syncClientId() {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) return;
    try {
        const local = localStorage.getItem(ID_IDENTITY_KEY);
        if (local) {
            await chrome.storage.sync.set({ [ID_IDENTITY_KEY]: local });
        }
    } catch (e) {
        // sync unavailable (e.g. not signed in) — keep the local identity
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
