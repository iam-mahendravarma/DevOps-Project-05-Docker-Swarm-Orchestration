import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './index.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://backend:8000/'
function App() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  });
  const [editingId, setEditingId] = useState(null);

  // Fetch todos on component mount
  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/todos`);
      setTodos(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch todos. Make sure the backend is running.');
      console.error('Error fetching todos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    try {
      if (editingId) {
        // Update existing todo
        await axios.put(`${API_BASE_URL}/todos/${editingId}`, formData);
        setEditingId(null);
      } else {
        // Create new todo
        await axios.post(`${API_BASE_URL}/todos`, formData);
      }
      
      setFormData({ title: '', description: '' });
      fetchTodos();
    } catch (err) {
      setError('Failed to save todo');
      console.error('Error saving todo:', err);
    }
  };

  const handleEdit = (todo) => {
    setFormData({
      title: todo.title,
      description: todo.description || ''
    });
    setEditingId(todo.id);
  };

  const handleCancelEdit = () => {
    setFormData({ title: '', description: '' });
    setEditingId(null);
  };

  const handleToggleComplete = async (todo) => {
    try {
      await axios.put(`${API_BASE_URL}/todos/${todo.id}`, {
        completed: !todo.completed
      });
      fetchTodos();
    } catch (err) {
      setError('Failed to update todo');
      console.error('Error updating todo:', err);
    }
  };

  const handleDelete = async (todoId) => {
    if (window.confirm('Are you sure you want to delete this todo?')) {
      try {
        await axios.delete(`${API_BASE_URL}/todos/${todoId}`);
        fetchTodos();
      } catch (err) {
        setError('Failed to delete todo');
        console.error('Error deleting todo:', err);
      }
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container">
      <div className="header">
        <h1>📝 ToDo App</h1>
        <p>Organize your tasks and boost your productivity</p>
      </div>

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      <div className="todo-form">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="What needs to be done?"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add more details (optional)"
            />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn">
              {editingId ? 'Update Todo' : 'Add Todo'}
            </button>
            {editingId && (
              <button type="button" className="btn btn-secondary" onClick={handleCancelEdit}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="todo-list">
        {loading ? (
          <div className="loading">Loading todos...</div>
        ) : todos.length === 0 ? (
          <div className="empty-state">
            <h3>No todos yet</h3>
            <p>Create your first todo to get started!</p>
          </div>
        ) : (
          todos.map((todo) => (
            <div key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
              <div className="todo-header">
                <div className="todo-title">{todo.title}</div>
                <div className="todo-actions">
                  <button
                    className={`btn btn-small ${todo.completed ? 'btn-secondary' : 'btn-success'}`}
                    onClick={() => handleToggleComplete(todo)}
                  >
                    {todo.completed ? 'Undo' : 'Complete'}
                  </button>
                  <button
                    className="btn btn-small btn-secondary"
                    onClick={() => handleEdit(todo)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-small btn-danger"
                    onClick={() => handleDelete(todo.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              {todo.description && (
                <div className="todo-description">{todo.description}</div>
              )}
              <div className="todo-meta">
                <span className={`status-badge ${todo.completed ? 'status-completed' : 'status-pending'}`}>
                  {todo.completed ? 'Completed' : 'Pending'}
                </span>
                <span>Created: {formatDate(todo.created_at)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;
