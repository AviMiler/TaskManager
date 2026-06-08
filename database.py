import sqlite3
import shutil
import os
from datetime import datetime
from pathlib import Path

DB_DIR = Path("data")
DB_PATH = DB_DIR / "tasks.db"
BACKUP_PATH = DB_DIR / "tasks.db.backup"

def ensure_db_dir():
    DB_DIR.mkdir(exist_ok=True)

def create_backup():
    if DB_PATH.exists():
        shutil.copy2(DB_PATH, BACKUP_PATH)

def init_db():
    ensure_db_dir()
    conn = sqlite3.connect(str(DB_PATH))
    c = conn.cursor()

    c.execute('''CREATE TABLE IF NOT EXISTS projects
                 (id INTEGER PRIMARY KEY, name TEXT UNIQUE, created_at TEXT)''')

    c.execute('''CREATE TABLE IF NOT EXISTS tasks
                 (id INTEGER PRIMARY KEY, project_id INTEGER, title TEXT,
                  description TEXT, completed INTEGER DEFAULT 0, created_at TEXT,
                  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE)''')

    conn.commit()
    conn.close()

def get_db():
    ensure_db_dir()
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def add_project(name):
    create_backup()
    conn = get_db()
    c = conn.cursor()
    try:
        c.execute("INSERT INTO projects (name, created_at) VALUES (?, ?)",
                  (name, datetime.now().isoformat()))
        conn.commit()
        project_id = c.lastrowid
        conn.close()
        return {"id": project_id, "name": name, "success": True}
    except sqlite3.IntegrityError:
        conn.close()
        return {"success": False, "error": "Project already exists"}

def get_projects():
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT id, name, created_at FROM projects ORDER BY created_at DESC")
    projects = [dict(row) for row in c.fetchall()]
    conn.close()
    return projects

def get_project(project_id):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT id, name, created_at FROM projects WHERE id = ?", (project_id,))
    project = c.fetchone()
    conn.close()
    return dict(project) if project else None

def delete_project(project_id):
    create_backup()
    conn = get_db()
    c = conn.cursor()
    c.execute("DELETE FROM projects WHERE id = ?", (project_id,))
    conn.commit()
    conn.close()

def add_task(project_id, title, description=""):
    create_backup()
    conn = get_db()
    c = conn.cursor()
    c.execute("INSERT INTO tasks (project_id, title, description, created_at) VALUES (?, ?, ?, ?)",
              (project_id, title, description, datetime.now().isoformat()))
    conn.commit()
    task_id = c.lastrowid
    conn.close()
    return {"id": task_id, "project_id": project_id, "title": title, "description": description, "completed": 0}

def get_tasks(project_id):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT id, project_id, title, description, completed, created_at FROM tasks WHERE project_id = ? ORDER BY created_at DESC",
              (project_id,))
    tasks = [dict(row) for row in c.fetchall()]
    conn.close()
    return tasks

def toggle_task(task_id):
    create_backup()
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT completed FROM tasks WHERE id = ?", (task_id,))
    result = c.fetchone()
    if result:
        new_completed = 1 - result[0]
        c.execute("UPDATE tasks SET completed = ? WHERE id = ?", (new_completed, task_id))
        conn.commit()
        conn.close()
        return {"id": task_id, "completed": new_completed}
    conn.close()
    return None

def delete_task(task_id):
    create_backup()
    conn = get_db()
    c = conn.cursor()
    c.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    conn.commit()
    conn.close()

def update_task(task_id, title, description):
    create_backup()
    conn = get_db()
    c = conn.cursor()
    c.execute("UPDATE tasks SET title = ?, description = ? WHERE id = ?", (title, description, task_id))
    conn.commit()
    conn.close()
