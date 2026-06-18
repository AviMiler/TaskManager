// Backend selection for the data layer. 'local' = shared JSON file via
// the File System Access API (today). Switch to a server later with:
//   window.APP_CONFIG = { backend: 'http', apiBaseUrl: '/api' };
//
// Kept in an external file (not an inline <script>) so the page works
// unchanged inside a Manifest V3 Chrome extension, whose Content Security
// Policy forbids inline scripts.
window.APP_CONFIG = { backend: 'local' };
