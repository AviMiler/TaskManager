# מפת פרויקט — TaskBoard

מדריך מיפוי לסוכנים/Agents: איפה כל דבר נמצא, כדי לאתר קוד מהר בלי לסרוק את כל הפרויקט.

## מבנה כללי

```
TaskManager/
├── index.html      # נקודת הכניסה - כל ה-<script> בסדר טעינה קבוע
├── style.css       # כל העיצוב (Design tokens, layout, components)
├── config.js       # APP_CONFIG - בחירת backend (local/http)
├── fsSync.js       # סנכרון קובץ משותף (File System Access API) - FSSync object
├── actions.js      # דיספצ'ר data-action (תחליף ל-onclick, CSP-safe)
├── background.js   # service worker (Chrome extension)
├── manifest.json   # הגדרות תוסף Chrome (MV3)
├── store/          # שכבת גישה לנתונים (Store interface)
└── js/             # לוגיקת האפליקציה - 19 מודולים, global scope משותף
```

⚠️ כל הקבצים ב-`js/` הם סקריפטים גלובליים רגילים (לא ES modules) — חולקים scope אחד.
**סדר הטעינה ב-index.html קריטי**: state.js ראשון (מגדיר קבועים/state גלובלי), globals.js אחרון (חושף פונקציות ל-window בשביל data-action).

## store/ — שכבת נתונים

| קובץ | תוכן |
|---|---|
| `store/ids.js` | יצירת IDs |
| `store/Store.js` | interface/ממשק בסיס |
| `store/LocalJsonStore.js` | מימוש localStorage |
| `store/HttpStore.js` | מימוש מבוסס שרת HTTP |
| `store/index.js` | בחירת store לפי config.js |

## js/ — מפת פונקציות לפי קובץ

### state.js (63 שורות) — קבועים + state גלובלי
`DB` (מפתחות localStorage, כולל `members: 'tb_members'`), `DEFAULT_USER`, `currentProjectId`, `editingTaskId`, `mandatoryProfileOpen`, `HUES`, `KNOWN_TAGS`, `PRESET_HUES`, `DEFAULT_COLUMNS`, `DEFAULT_TASK_TYPES`, `ICONS`

### utils.js (39) — עוזרים כלליים
`escapeHtml`, `unescapeForInput`, `nameHue`, `initials`, `escapeAttr`

### dialogs.js (91) — דיאלוגים מותאמים (alert/confirm/prompt)
`_buildDialog`, `showAlert`, `showConfirm`, `showPrompt`

### storage.js (139) — localStorage: פרויקטים/משימות/עמודות/סוגי משימה
`migrateTaskOwnership`, `getProjects`, `getAllTasks`, `getTasks`, `saveProjects`, `saveTasks`, `createBackup`, `sortColumns`, `getColumns`, `saveColumns`, `getTaskTypes`, `saveTaskTypes`, `addColumn`, `deleteColumn`, `renameColumn`

### members.js (122) — צוות/אנשי קשר (members)
`getMembers`, `saveMembers`, `getMemberById`, `memberName`, `upsertMember`, `addMember`, `renameMember`, `removeMember`, `propagateMemberName`, `assigneeOptionsHtml`, `migrateMembersAndAssignees`

### user.js (191) — פרופיל משתמש נוכחי + UI סנכרון
`getUser`, `saveUser`, `isMine`, `toggleMineOnly`, `renderUserUI` (topbar chip: `#topUserAvatar`/`#topUserName`/`#topUserRole`), `renderSyncStatusUI`, `openUserProfileModal(mandatory)`, `saveUserFromModal`

### projects.js (339) — CRUD פרויקטים + סלקטור
`getCurrentProjectId`, `setCurrentProjectId`, `addProject`, `deleteProject`, `openProjectSettings`, `closeProjectSettings`, `saveProjectSettings`, `selectProject`, `restoreCurrentProject`, `loadProjects`, `updateSelectorButton`, `renderProjectDetails`

### links.js (316) — קישורי פרויקט + dropdown סלקטור
`renderLinkIcon`, `openLinkModal`, `closeLinkModal`, `saveLinkFromModal`, `deleteLink`, `toggleProjectDropdown`, `closeProjectDropdown`

### tasks.js (83) — CRUD משימות
`addTask`, `updateTask`, `canDeleteTask`, `deleteTask`, `moveTask`

### kanban.js (218) — רינדור לוח Kanban + Drag&Drop
`renderKanban`, `buildCard`, `setupColumnDragDrop`, `reorderColumn`

### modal.js (193) — מודאל עריכת/יצירת משימה
`openEditModal`, `buildModal` (כולל `.modal-creator`, `<select id="modalAssignee">`), `parseDueDate`, `formatDueDate`, `saveTaskFromModal`, `closeModal`

### daily.js (188) — דיילי/סטנדאפ
`getDailies`, `saveDailies`, `todayKey`, `getOrCreateTodayDaily`, `upsertMyEntry`, `getInitials`, `formatHebrewDate`, `DAILY_FIELD_LABELS`, `dailyRowHtml`, `renderDailyTable`, `openDailyModal`, `bindDailyEditableInputs`, `renderDailyHistory`, `closeDailyModal`

### search.js (313) — חיפוש
`setupSearch`, `openSearchResults`, `closeSearchResults`, `openSearchPage`, `renderSearchPage`, `closeSearchPage`, `setSearchFilter`, `clearSearchFilters`, `openEditModalForTask`, `highlightMatch`

### filters.js (162) — סינון ומיון + rerender
`applyFiltersAndSort`, `openFilterMenu`, `openSortMenu`, `positionPopover`, `closePopovers`, `setFilter`, `clearFilters`, `setSort`, `updateFilterBadge`, `rerenderCurrentView`

### ui.js (146) — מעבר תצוגות (Kanban/List) + רשימה
`updateUI`, `setView`, `setListScope`, `renderList`

### menus.js (339) — תפריטים שונים + ניהול סוגים/צוות
`openNotificationsMenu`, `jumpToTask`, `openSettingsMenu`, `openUserMenu`, `buildColorSwatches`, `openManageTypesModal`, `closeManageTypesModal`, `openTeamModal`, `closeTeamModal`

### settings.js (66) — ייצוא/ייבוא/גיבוי/ניקוי
`exportData`, `importData`, `showBackupInfo`, `clearAllData`

### events.js (95) — אתחול + מאזיני אירועים גלובליים
`DOMContentLoaded` handler (`migrateMembersAndAssignees()`, `openUserProfileModal(true)` בהפעלה ראשונה), `setupEventListeners`

### globals.js (38) — חשיפת פונקציות ל-window עבור actions.js
כל `window.xxx = xxx`, כולל override `window.importData = function importData() {...}`

## קבצי תמיכה נוספים

- `fsSync.js` — `FSSync` object: sync לקובץ JSON משותף (File System Access API), merge לפי `id`+timestamps, כולל `members`
- `actions.js` — דיספצ'ר `data-action="fn(args)"` (תחליף ל-inline onclick, CSP-safe ל-MV3)
- `index.html` — מבנה DOM: topbar (לוגו/חיפוש/דיילי/התראות/הגדרות/פרופיל), sidebar (project selector + details), main (page header/tabs/kanban board/empty state)

## טיפים לסוכנים

- חיפוש פונקציה: `grep -rn "functionName" js/` — שם הקובץ מצביע על התחום הפונקציונלי לפי הטבלה לעיל.
- שינוי הקשור ל"אחראי משימה"/assignee → `js/members.js` + `js/modal.js` + `js/tasks.js`
- שינוי הקשור לסנכרון צוות/קובץ משותף → `fsSync.js`
- שינוי הקשור ל-UI כללי/topbar/פרופיל → `js/user.js`
- כל `window.X = ...` חדש חייב גם להתעדכן ב-`js/globals.js` אחרת `data-action` לא ימצא את הפונקציה.
