const statusEl = document.getElementById('status');
const pickBtn = document.getElementById('pickBtn');

pickBtn.addEventListener('click', async () => {
  statusEl.textContent = '';
  try {
    const dirHandle = await window.showDirectoryPicker();

    const fileHandle = await dirHandle.getFileHandle('test.json', { create: true });

    const writable = await fileHandle.createWritable();
    const data = {
      message: 'File System Access API works in this extension context',
      writtenAt: new Date().toISOString()
    };
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();

    statusEl.textContent = `Success: wrote test.json into "${dirHandle.name}"`;
  } catch (err) {
    if (err.name === 'AbortError') {
      statusEl.textContent = 'Cancelled: no folder selected.';
    } else {
      statusEl.textContent = `Error: ${err.name}: ${err.message}`;
    }
    console.error(err);
  }
});
