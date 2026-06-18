// ===== CSP-safe action dispatcher =====
// Manifest V3 extension pages run under a Content Security Policy that forbids
// inline scripts, which includes inline event-handler attributes such as
// onclick="doThing()". To keep the app working unchanged inside a Chrome
// extension, every former onclick="EXPR" was rewritten to data-action="EXPR"
// (a plain data attribute, not executable markup). This single delegated
// listener interprets that EXPR at click time.
//
// The grammar is intentionally tiny — exactly what the app emits:
//   * one or more statements separated by ';'
//   * each statement is a call:  callee(arg, arg, ...)
//   * callee is a global function name, or a dotted path whose root is one of
//     `event`, `document`, `window` (e.g. event.stopPropagation, FSSync.connect)
//   * args are: 'single/"double" quoted strings', numbers, event, null,
//     true, false, or a bare global identifier
// No eval()/new Function() is used, so the default extension CSP is satisfied.
(function () {
    'use strict';

    function resolveRoot(name, ctx) {
        if (name === 'event') return ctx.event;
        if (name === 'window') return window;
        if (name === 'document') return document;
        return window[name];
    }

    // Split on a separator char, but only at the top level (ignore the
    // separator when it appears inside a quoted string).
    function splitTop(str, sep) {
        const out = [];
        let buf = '', quote = null;
        for (let i = 0; i < str.length; i++) {
            const c = str[i];
            if (quote) {
                buf += c;
                if (c === '\\') { if (i + 1 < str.length) { buf += str[++i]; } }
                else if (c === quote) quote = null;
            } else if (c === '"' || c === "'") {
                quote = c; buf += c;
            } else if (c === sep) {
                out.push(buf); buf = '';
            } else buf += c;
        }
        out.push(buf);
        return out;
    }

    function parseArg(tok, ctx) {
        tok = tok.trim();
        if (tok === '') return undefined;
        const q = tok[0];
        if (q === "'" || q === '"') {
            let val = '';
            for (let i = 1; i < tok.length && tok[i] !== q; i++) {
                if (tok[i] === '\\') { i++; val += tok[i] != null ? tok[i] : ''; }
                else val += tok[i];
            }
            return val;
        }
        if (tok === 'event') return ctx.event;
        if (tok === 'null') return null;
        if (tok === 'true') return true;
        if (tok === 'false') return false;
        if (tok === 'undefined') return undefined;
        if (!isNaN(Number(tok))) return Number(tok);
        return window[tok];
    }

    function runStatement(stmt, ctx) {
        stmt = stmt.trim();
        if (!stmt) return;
        const open = stmt.indexOf('(');
        const close = stmt.lastIndexOf(')');
        if (open < 0 || close < open) return;

        const callee = stmt.slice(0, open).trim();
        const argStr = stmt.slice(open + 1, close);

        const parts = callee.split('.');
        let base, fn;
        if (parts.length === 1) {
            base = window;
            fn = window[parts[0]];
        } else {
            base = resolveRoot(parts[0], ctx);
            for (let k = 1; k < parts.length - 1 && base != null; k++) base = base[parts[k]];
            fn = base != null ? base[parts[parts.length - 1]] : undefined;
        }
        if (typeof fn !== 'function') {
            if (typeof console !== 'undefined') console.warn('[actions] no handler for', callee);
            return;
        }

        const args = argStr.trim() === ''
            ? []
            : splitTop(argStr, ',').map(a => parseArg(a, ctx));
        fn.apply(base, args);
    }

    function run(expr, ctx) {
        splitTop(expr, ';').forEach(s => runStatement(s, ctx));
    }

    document.addEventListener('click', function (e) {
        const el = e.target.closest('[data-action]');
        if (!el) return;
        run(el.getAttribute('data-action'), { event: e, el: el });
    });
})();
