// Expose globally for inline handlers
window.deleteProject = deleteProject;
window.deleteTask = deleteTask;
window.openEditModal = openEditModal;
window.closeLinkModal = closeLinkModal;
window.openProjectSettings = openProjectSettings;
window.closeProjectSettings = closeProjectSettings;
window.saveProjectSettings = saveProjectSettings;
window.saveTaskFromModal = saveTaskFromModal;
window.closeModal = closeModal;
window.openDailyModal = openDailyModal;
window.closeDailyModal = closeDailyModal;
window.openUserProfileModal = openUserProfileModal;
window.saveUserFromModal = saveUserFromModal;
window.setFilter = setFilter;
window.setSort = setSort;
window.clearFilters = clearFilters;
window.closePopovers = closePopovers;
window.exportData = exportData;
window.showBackupInfo = showBackupInfo;
window.clearAllData = clearAllData;
window.jumpToTask = jumpToTask;
window.setListScope = setListScope;
window.openManageTypesModal = openManageTypesModal;
window.closeManageTypesModal = closeManageTypesModal;
window.closeSearchPage = closeSearchPage;
window.setSearchFilter = setSearchFilter;
window.clearSearchFilters = clearSearchFilters;
window.openEditModalForTask = openEditModalForTask;
window.openSearchPage = openSearchPage;
// Triggers the hidden <input type="file"> used for JSON import. Replaces the
// former inline onclick="document.getElementById('importFile').click()".
window.importData = function importData() {
    const el = document.getElementById('importFile');
    if (el) el.click();
};
