// ===== Utilities =====
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

function unescapeForInput(text) {
    if (!text) return '';
    return String(text)
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'");
}

function nameHue(name) {
    let h = 0;
    for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return h % 360;
}

function initials(name) {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    return (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
}

function escapeAttr(text) {
    if (!text) return '';
    return String(text).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// Keep only digits — national IDs (תעודת זהות) are entered as plain numbers.
function normalizeNationalId(id) {
    return String(id || '').replace(/\D/g, '');
}

// Israeli national-ID (תעודת זהות) checksum validation. This is NOT a security
// measure — it only catches typos so two people don't collide or get split by a
// mistyped digit. Returns true for a valid 1–9 digit id, false otherwise.
function isValidIsraeliId(id) {
    id = normalizeNationalId(id);
    if (!id || id.length > 9) return false;
    id = id.padStart(9, '0');
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        let digit = Number(id[i]) * ((i % 2) + 1);
        if (digit > 9) digit -= 9;
        sum += digit;
    }
    return sum % 10 === 0;
}

// Mask a national id for display (show only the last 4 digits).
function maskNationalId(id) {
    id = normalizeNationalId(id);
    if (id.length <= 4) return id;
    return '•'.repeat(id.length - 4) + id.slice(-4);
}
