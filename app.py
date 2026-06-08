from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import database

app = Flask(__name__)
CORS(app)

@app.before_request
def init():
    database.init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/projects', methods=['GET'])
def get_projects():
    projects = database.get_projects()
    return jsonify(projects)

@app.route('/api/projects', methods=['POST'])
def create_project():
    data = request.json
    result = database.add_project(data['name'])
    return jsonify(result), 201 if result.get('success') else 400

@app.route('/api/projects/<int:project_id>', methods=['DELETE'])
def delete_project(project_id):
    database.delete_project(project_id)
    return jsonify({"success": True})

@app.route('/api/projects/<int:project_id>/tasks', methods=['GET'])
def get_tasks(project_id):
    tasks = database.get_tasks(project_id)
    return jsonify(tasks)

@app.route('/api/tasks', methods=['POST'])
def create_task():
    data = request.json
    task = database.add_task(data['project_id'], data['title'], data.get('description', ''))
    return jsonify(task), 201

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    database.delete_task(task_id)
    return jsonify({"success": True})

@app.route('/api/tasks/<int:task_id>/toggle', methods=['PUT'])
def toggle_task(task_id):
    result = database.toggle_task(task_id)
    return jsonify(result) if result else jsonify({"error": "Task not found"}), 404

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    data = request.json
    database.update_task(task_id, data['title'], data.get('description', ''))
    return jsonify({"success": True})

if __name__ == '__main__':
    database.init_db()
    app.run(debug=True, host='0.0.0.0', port=5000)
