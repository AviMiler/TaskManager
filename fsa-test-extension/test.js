const statusEl = document.getElementById('status');
const fileNameEl = document.getElementById('fileName');
const pickBtn = document.getElementById('pickBtn');
const saveBtn = document.getElementById('saveBtn');
const editor = document.getElementById('jsonEditor');

let fileHandle = null;

pickBtn.addEventListener('click', async () => {
  statusEl.textContent = '';
  try {
    [fileHandle] = await window.showOpenFilePicker({
      types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
      excludeAcceptAllOption: false
    });

    const file = await fileHandle.getFile();
    const text = await file.text();

    editor.value = text;
    fileNameEl.textContent = `File: ${fileHandle.name}`;
    statusEl.textContent = 'Loaded. Edit the JSON below and click Save.';
  } catch (err) {
    if (err.name === 'AbortError') {
      statusEl.textContent = 'Cancelled: no file selected.';
    } else {
      statusEl.textContent = `Error: ${err.name}: ${err.message}`;
    }
    console.error(err);
  }
});

saveBtn.addEventListener('click', async () => {
  statusEl.textContent = '';

  if (!fileHandle) {
    statusEl.textContent = 'Open a file first.';
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(editor.value);
  } catch (e) {
    statusEl.textContent = `Invalid JSON: ${e.message}`;
    return;
  }

  try {
    const granted = await fileHandle.requestPermission({ mode: 'readwrite' });
    if (granted !== 'granted') {
      statusEl.textContent = 'Write permission denied.';
      return;
    }

    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(parsed, null, 2));
    await writable.close();
    statusEl.textContent = `Success: saved changes to "${fileHandle.name}"`;
  } catch (err) {
    statusEl.textContent = `Error: ${err.name}: ${err.message}`;
    console.error(err);
  }
});
