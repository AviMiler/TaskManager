// ===== Init =====
document.addEventListener('DOMContentLoaded', async () => {
    setupEventListeners();
    renderUserUI();
    migrateTaskOwnership();
    loadProjects();
    restoreCurrentProject();

    if (!localStorage.getItem(DB.user)) {
        openUserProfileModal();
    }

    await store.init();
    if (window.FSSync) renderSyncStatusUI();
});

// ===== Event Listeners =====
function setupEventListeners() {
    // Project selector dropdown toggle
    const selectorBtn = document.getElementById('projectSelectorBtn');
    if (selectorBtn) selectorBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleProjectDropdown(); });

    // Close project dropdown on outside click
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('projectDropdown');
        const sBtn = document.getElementById('projectSelectorBtn');
        if (dropdown && dropdown.classList.contains('open') &&
            !dropdown.contains(e.target) && e.target !== sBtn && !sBtn.contains(e.target)) {
            closeProjectDropdown();
        }
    });

    // New project
    document.getElementById('newProjectInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addProject(e.target.value);
    });
    document.querySelector('.sidebar-add-btn').addEventListener('click', () => {
        addProject(document.getElementById('newProjectInput').value);
    });

    // Add task
    document.querySelector('.add-task-btn').addEventListener('click', () => openEditModal(null));

    // View tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => setView(btn.dataset.view));
    });

    // Filter + Sort
    const filterBtn = document.querySelector('.header-btn-filter');
    const sortBtn = document.querySelector('.header-btn-sort');
    if (filterBtn) filterBtn.addEventListener('click', (e) => { e.stopPropagation(); openFilterMenu(filterBtn); });
    if (sortBtn) sortBtn.addEventListener('click', (e) => { e.stopPropagation(); openSortMenu(sortBtn); });

    // Topbar icons
    const bellBtn = document.querySelector('.topbar-icon-btn[aria-label="התראות"]');
    const settingsBtn = document.querySelector('.topbar-icon-btn[aria-label="הגדרות"]');
    const dailyBtn = document.querySelector('.topbar-icon-btn[aria-label="דיילי"]');
    if (bellBtn) bellBtn.addEventListener('click', (e) => { e.stopPropagation(); openNotificationsMenu(bellBtn); });
    if (settingsBtn) settingsBtn.addEventListener('click', (e) => { e.stopPropagation(); openSettingsMenu(settingsBtn); });
    if (dailyBtn) dailyBtn.addEventListener('click', (e) => { e.stopPropagation(); openDailyModal(); });

    // Import file input
    const importInput = document.getElementById('importFile');
    if (importInput) importInput.addEventListener('change', (e) => importData(e.target.files[0]));

    // Close popovers on outside click
    document.addEventListener('click', (e) => {
        const pop = document.getElementById('activePopover');
        if (pop && !pop.contains(e.target)) closePopovers();
        const sr = document.getElementById('searchResults');
        if (sr && !sr.contains(e.target) && !e.target.closest('.topbar-search-wrap') && !e.target.closest('#searchPage')) closeSearchResults();
    });

    // Escape key to close modal / popover / search
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const m = document.getElementById('taskModal');
            if (m) { closeModal(); return; }
            const dm = document.getElementById('dailyModal');
            if (dm) { closeDailyModal(); return; }
            const sp = document.getElementById('searchPage');
            if (sp) { closeSearchPage(); return; }
            if (document.getElementById('searchResults')) {
                closeSearchResults();
                document.getElementById('searchInput').value = '';
                return;
            }
            closePopovers();
        }
    });

    setupSearch();
}
