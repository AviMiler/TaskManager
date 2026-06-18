// ===== Backend switch =====
// Picks the Store implementation from window.APP_CONFIG and exposes it as the
// global `store`. Default is the local JSON-file backend; set
// window.APP_CONFIG.backend = 'http' (before this script runs) to move the
// whole app to a server with no other change.

const STORE_BACKEND = (window.APP_CONFIG && window.APP_CONFIG.backend) || 'local';

const store = STORE_BACKEND === 'http'
    ? new HttpStore(window.APP_CONFIG && window.APP_CONFIG.apiBaseUrl)
    : new LocalJsonStore();

window.store = store;
