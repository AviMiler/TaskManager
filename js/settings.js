// ===== Settings actions =====
function exportData() {
    closePopovers();
    const data = {
        projects: getProjects(),
        tasks: getAllTasks(),
        exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `taskboard-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importData(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!Array.isArray(data.projects) || !Array.isArray(data.tasks)) {
                await showAlert('קובץ לא תקין');
                return;
            }
            const ok = await showConfirm(
                `לייבא ${data.projects.length} פרויקטים ו-${data.tasks.length} משימות?\nזה יחליף את הנתונים הקיימים.`,
                'ייבוא נתונים', 'ייבא', 'ביטול'
            );
            if (!ok) return;
            localStorage.setItem(DB.projects, JSON.stringify(data.projects));
            localStorage.setItem(DB.tasks, JSON.stringify(data.tasks));
            createBackup();
            location.reload();
        } catch (err) {
            await showAlert('שגיאה בקריאת הקובץ: ' + err.message);
        }
    };
    reader.readAsText(file);
}

async function showBackupInfo() {
    closePopovers();
    const b = localStorage.getItem(DB.backup);
    if (!b) {
        await showAlert('אין גיבוי זמין');
        return;
    }
    const backup = JSON.parse(b);
    await showAlert(
        `גיבוי אחרון: ${new Date(backup.timestamp).toLocaleString('he-IL')}\n${backup.projects.length} פרויקטים, ${backup.tasks.length} משימות`,
        'פרטי גיבוי'
    );
}

async function clearAllData() {
    closePopovers();
    const ok1 = await showConfirm('זה ימחק את כל הפרויקטים והמשימות!\n\nהאם אתה בטוח?', 'מחיקת כל הנתונים', 'מחק הכל', 'ביטול');
    if (!ok1) return;
    const ok2 = await showConfirm('אישור אחרון — אין דרך חזרה!', 'אישור סופי', 'מחק', 'ביטול');
    if (!ok2) return;
    [DB.projects, DB.tasks, DB.backup, DB.currentProject].forEach(k => localStorage.removeItem(k));
    location.reload();
}
