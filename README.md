# TaskBoard — מנהל משימות מקצועי 🎯

מערכת ניהול משימות בסגנון **Jira / Azure DevOps / Linear** - לוח Kanban מקצועי עם עברית RTL מלאה.

## ✨ תכונות

✅ **לוח Kanban מקצועי** - 3 עמודות: To Do / Active / Closed
✅ **Drag & Drop** - גרור משימות בין עמודות
✅ **תעדוף (Priority)** - גבוה / בינוני / נמוך
✅ **תגיות (Tags)** - קטגוריות לכל משימה
✅ **תאריכי יעד (Due dates)** - עם התראה כאשר זה דחוף
✅ **אחראים (Assignees)** - תמונת פרופיל עם צבע ייחודי
✅ **חיפוש חי** - מצא משימות מיד
✅ **100% דפדפן** - אין צורך בסרוור
✅ **אחסון מקומי** - localStorage עם גיבוי אוטומטי
✅ **RTL עברית** - תמיכה מלאה בעברית
✅ **Design Tokens מקצועיים** - על פי standards של Jira/Azure DevOps

## 🚀 התחלה

### דרך 1: פתח ישירות
לחץ פעמיים על `index.html` או גרור אותו לדפדפן.

### דרך 2: עם שרת מקומי (מומלץ)
```bash
cd TaskManager
python3 -m http.server 8000
```
פתח: `http://localhost:8000`

## 📁 קבצים

```
TaskManager/
├── index.html      # האפליקציה
├── style.css       # עיצוב (Design tokens)
├── script.js       # לוגיקה (Kanban + CRUD)
└── README.md
```

## 🎨 Design System

מבוסס על תיעוד מקצועי עם:

### צבעים
- **Primary**: `#0078d4` (Azure blue)
- **State colors**: Slate (todo) / Blue (doing) / Green (done)
- **Priority**: Red (high) / Orange (med) / Gray (low)

### Typography
- **Font**: Inter + Assistant (עברית)
- **Sizes**: 11-20px hierarchy

### Components
- Avatar (with deterministic color from name)
- Priority flag pills
- Tag pills
- Cards with state stripe
- Columns with state indicators

## 📖 שימוש

### צור פרויקט
1. בסיידבר השמאלי, הקלד שם פרויקט
2. לחץ `+` או Enter

### צור משימה
1. לחץ על "+ משימה" בכותרת הימנית
2. או לחץ `+` בראש כל עמודה
3. מלא את הטופס:
   - **כותרת** (חובה)
   - **תיאור** (אופציונלי)
   - **מצב** - לביצוע / בביצוע / בוצע
   - **תעדוף** - גבוה / בינוני / נמוך
   - **תגית** - מסמכים / פגישה / פנימי / bug / feature
   - **אחראי** - שם מלא
   - **תאריך יעד**

### העבר משימה בין עמודות
- **גרור** את המשימה לעמודה אחרת
- או **לחץ** על המשימה ושנה את "מצב" בטופס

### ערוך משימה
- לחץ על המשימה כדי לפתוח את הטופס
- או לחץ על ✎ (עט) בפינת הכרטיס

### מחק
- לחץ על × (X) בפינת הכרטיס / הפרויקט

### חיפוש
- הקלד בשורת החיפוש בכותרת
- המשימות תסוננות חי

## 💾 איחסון

הנתונים נשמרים בדפדפן שלך:
- `tb_projects` - פרויקטים
- `tb_tasks` - משימות
- `tb_backup` - גיבוי אוטומטי
- `tb_currentProject` - הפרויקט הנבחר

**גיבוי אוטומטי** נוצר בכל שינוי (יצירה/עריכה/מחיקה).

## ⌨️ קיצורי מקלדת

| מקש | פעולה |
|---|---|
| `Enter` בשדה פרויקט | צור פרויקט |
| `Esc` במודל | סגור מודל |
| `Click` על כרטיס | פתח לעריכה |
| `Drag` כרטיס | העבר בין עמודות |

## 🔐 פרטיות

✅ הכל מקומי - אין שרוור, אין ענן, אין מעקב
✅ הנתונים שלך נשמרים בדפדפן שלך בלבד

## 🎯 רעיונות לעתיד

- [ ] **Statistics view** - גרפים והתקדמות
- [ ] **List view** - תצוגת רשימה
- [ ] **Filter & Sort** - סינון לפי priority/tag/assignee
- [ ] **Export to JSON** - שמירה לקובץ
- [ ] **Import from JSON** - שחזור מקובץ
- [ ] **Multiple assignees** - יותר ממשתמש אחד
- [ ] **Comments** - דיון על משימות
- [ ] **Attachments** - קבצים מצורפים
- [ ] **Recurring tasks** - משימות חוזרות

---

**Built with HTML + CSS + JavaScript. Zero dependencies. Pure browser.** 🚀
