const statusEl = document.getElementById('status');
const pickBtn = document.getElementById('pickBtn');
const saveBtn = document.getElementById('saveBtn');
const editor = document.getElementById('jsonEditor');

let dirHandle = null;

const DEFAULT_CONTENT = {
  message: 'File System Access API works in this extension context',
  writtenAt: new Date().toISOString()
};

pickBtn.addEventListener('click', async () => {
  statusEl.textContent = '';
  try {
    dirHandle = await window.showDirectoryPicker();

    let text;
    try {
      const fileHandle = await dirHandle.getFileHandle('test.json');
      const file = await fileHandle.getFile();
      text = await file.text();
    } catch (e) {
      // file doesn't exist yet - start with default content
      text = JSON.stringify(DEFAULT_CONTENT, null, 2);
    }

    editor.value = text;
    statusEl.textContent = `Loaded "${dirHandle.name}". Edit the JSON below and click Save.`;
  } catch (err) {
    if (err.name === 'AbortError') {
      statusEl.textContent = 'Cancelled: no folder selected.';
    } else {
      statusEl.textContent = `Error: ${err.name}: ${err.message}`;
    }
    console.error(err);
  }
});

saveBtn.addEventListener('click', async () => {
  statusEl.textContent = '';

  if (!dirHandle) {
    statusEl.textContent = 'Pick a folder first.';
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
    const fileHandle = await dirHandle.getFileHandle('test.json', { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(parsed, null, 2));
    await writable.close();
    statusEl.textContent = `Success: saved test.json into "${dirHandle.name}"`;
  } catch (err) {
    statusEl.textContent = `Error: ${err.name}: ${err.message}`;
    console.error(err);
  }
});
