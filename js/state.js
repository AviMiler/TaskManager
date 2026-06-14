// ===== Storage Keys =====
const DB = {
    projects: 'tb_projects',
    tasks: 'tb_tasks',
    backup: 'tb_backup',
    currentProject: 'tb_currentProject',
    columns: 'tb_columns',
    taskTypes: 'tb_task_types',
    user: 'tb_user',
    dailies: 'tb_dailies',
    mineOnly: 'tb_mine_only',
    tasksMineOnly: 'tb_tasks_mine_only',
    members: 'tb_members',
    membersMigrated: 'tb_members_migrated'
};

const DEFAULT_USER = { name: 'דנה גולן', role: 'מנהל פרויקטים', hue: 200 };

let currentProjectId = null;
let editingTaskId = null;
let draggingTaskId = null;
let draggingColumnId = null;
let currentView = 'kanban'; // 'kanban' | 'list'
let listScope = 'current'; // 'current' | 'all'
let activeFilters = { priority: null, tag: null, assignee: null };
let activeSort = 'created-desc'; // 'created-desc' | 'created-asc' | 'priority' | 'title' | 'due'
let searchPageTerm = null;
let searchPageFilters = { projectId: null, priority: null, state: null };
let showMineOnly = localStorage.getItem(DB.mineOnly) === '1';
let tasksMineOnly = localStorage.getItem(DB.tasksMineOnly) === '1';
let mandatoryProfileOpen = false;

// Hue palette for project dots
const HUES = [230, 160, 40, 290, 0, 60, 120, 180, 260, 320];

// Tag colors known (Hebrew)
const KNOWN_TAGS = ['מסמכים', 'פגישה', 'פנימי', 'bug', 'feature'];

// Preset hues for color picker
const PRESET_HUES = [0, 25, 50, 100, 140, 175, 210, 250, 275, 320];

// Default kanban columns
const DEFAULT_COLUMNS = [
    { id: 'todo',    name: 'To Do',    hue: 220, order: 0 },
    { id: 'doing',   name: 'Active',   hue: 210, order: 1 },
    { id: 'testing', name: 'בבדיקות',  hue: 35,  order: 2 },
    { id: 'done',    name: 'Closed',   hue: 145, order: 3 }
];

const DEFAULT_TASK_TYPES = [
    { id: 'bug',      name: 'Bug',      hue: 0   },
    { id: 'feature',  name: 'Feature',  hue: 220 },
    { id: 'task',     name: 'Task',     hue: 210 },
    { id: 'refactor', name: 'Refactor', hue: 280 },
    { id: 'docs',     name: 'Docs',     hue: 160 },
];

const ICONS = {
    pencil: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    export: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    import: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
    save:   `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
    tag:    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
    trash:  `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
    check:  `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
};
