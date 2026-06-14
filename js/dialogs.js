// ===== Custom Dialogs =====
function _buildDialog({ title, message, inputDefault, buttons }) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';

        const box = document.createElement('div');
        box.className = 'dialog-box';
        box.setAttribute('role', 'dialog');
        box.setAttribute('aria-modal', 'true');

        const titleEl = title ? `<div class="dialog-title">${escapeHtml(title)}</div>` : '';
        const msgEl   = message ? `<div class="dialog-message">${escapeHtml(message).replace(/\n/g, '<br>')}</div>` : '';
        const inputEl = inputDefault !== undefined
            ? `<input id="dialogInput" class="dialog-input field-input" type="text" value="${escapeHtml(inputDefault)}">`
            : '';

        box.innerHTML = `
            ${titleEl}
            ${msgEl}
            ${inputEl}
            <div class="dialog-btns"></div>
        `;

        const btnsEl = box.querySelector('.dialog-btns');
        buttons.forEach(({ label, value, primary }) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = primary ? 'btn-primary' : 'btn-secondary';
            btn.textContent = label;
            btn.addEventListener('click', () => {
                overlay.remove();
                if (inputDefault !== undefined) {
                    resolve(value === true ? box.querySelector('#dialogInput').value : null);
                } else {
                    resolve(value);
                }
            });
            btnsEl.appendChild(btn);
        });

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        const input = box.querySelector('#dialogInput');
        if (input) {
            input.focus();
            input.select();
            input.addEventListener('keydown', e => {
                if (e.key === 'Enter') btnsEl.querySelector('.btn-primary')?.click();
                if (e.key === 'Escape') btnsEl.querySelector('.btn-secondary')?.click();
            });
        } else {
            btnsEl.querySelector('.btn-primary')?.focus();
            overlay.addEventListener('keydown', e => {
                if (e.key === 'Escape') btnsEl.querySelector('.btn-secondary, .btn-primary')?.click();
            });
        }
    });
}

function showAlert(message, title) {
    return _buildDialog({
        title,
        message,
        buttons: [{ label: 'אישור', value: true, primary: true }]
    });
}

function showConfirm(message, title, okLabel = 'אישור', cancelLabel = 'ביטול') {
    return _buildDialog({
        title,
        message,
        buttons: [
            { label: cancelLabel, value: false, primary: false },
            { label: okLabel,     value: true,  primary: true  }
        ]
    });
}

function showPrompt(message, defaultValue = '', title) {
    return _buildDialog({
        title,
        message,
        inputDefault: defaultValue,
        buttons: [
            { label: 'ביטול', value: null,  primary: false },
            { label: 'אישור', value: true,  primary: true  }
        ]
    });
}
