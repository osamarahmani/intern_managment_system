import React, { useState, useEffect } from 'react';
import TaskItem from '../TaskItem';

const TaskSection = ({
  intern,
  onAddTask,
  onEditTask,
  onDeleteTask
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Form Fields State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [submissionDate, setSubmissionDate] = useState('');

  const [localErrors, setLocalErrors] = useState({});

  // Reset form when active intern changes or when closing/resetting
  useEffect(() => {
    resetForm();
  }, [intern]);

  const resetForm = () => {
    setTaskTitle('');
    setTaskDesc('');
    setDueDate('');
    setSubmissionDate('');
    setLocalErrors({});
    setIsFormOpen(false);
    setEditingTask(null);
  };

  const handleAddNewClick = () => {
    setEditingTask(null);
    setTaskTitle('');
    setTaskDesc('');
    setDueDate('');
    setSubmissionDate('');
    setLocalErrors({});
    setIsFormOpen(true);
  };

  const handleEditClick = (task) => {
    setEditingTask(task);
    setTaskTitle(task.title || '');
    setTaskDesc(task.description || '');
    setDueDate(task.dueDate || '');
    setSubmissionDate(task.submissionDate || '');
    setLocalErrors({});
    setIsFormOpen(true);
  };

  const handleSaveTask = (e) => {
    e.preventDefault();
    const errors = {};

    if (!taskTitle.trim()) errors.title = 'Task Title is required.';
    if (!taskDesc.trim()) errors.description = 'Task Description is required.';
    if (!dueDate) errors.dueDate = 'Due Date is required.';

    if (Object.keys(errors).length > 0) {
      setLocalErrors(errors);
      return;
    }

    const taskPayload = {
      title: taskTitle,
      description: taskDesc,
      dueDate,
      submissionDate
    };

    if (editingTask) {
      // Edit mode
      onEditTask(intern.id, editingTask.id, taskPayload);
    } else {
      // Add mode
      onAddTask(intern.id, taskPayload);
    }

    resetForm();
  };

  const handleDeleteClick = (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      onDeleteTask(intern.id, taskId);
    }
  };

  const tasks = intern.tasks || [];

  return (
    <div className="section-form" id="tasks-panel" role="tabpanel" aria-labelledby="tasks-tab" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Upper header action bar */}
      <div className="tasks-section-header">
        <h4 className="tasks-section-title">Assigned Tasks ({tasks.length})</h4>
        {!isFormOpen && (
          <button
            type="button"
            className="add-task-outline-btn"
            onClick={handleAddNewClick}
            aria-label="Add a new task"
          >
            <i className="ti ti-plus" aria-hidden="true" />
            Add New Task
          </button>
        )}
      </div>

      {/* Inline Add/Edit Task Form */}
      {isFormOpen && (
        <form onSubmit={handleSaveTask} className="task-form-card" noValidate>
          <h5 className="task-form-title">
            {editingTask ? 'Edit Task Specification' : 'Define New Task'}
          </h5>

          {/* Title */}
          <div className="input-group">
            <label className="form-label" htmlFor="task-title-input" style={{ fontSize: '12px' }}>
              Task Title <span className="required-asterisk">*</span>
            </label>
            <input
              type="text"
              id="task-title-input"
              placeholder="e.g. Design relational SQL schema"
              className={`form-input ${localErrors.title ? 'input-error' : ''}`}
              style={{ height: '38px', fontSize: '13px' }}
              value={taskTitle}
              onChange={(e) => { setTaskTitle(e.target.value); if (localErrors.title) setLocalErrors(prev => ({ ...prev, title: '' })); }}
              required
            />
            {localErrors.title && <span className="error-message" role="alert" style={{ fontSize: '11px' }}>{localErrors.title}</span>}
          </div>

          {/* Description */}
          <div className="input-group">
            <label className="form-label" htmlFor="task-desc-input" style={{ fontSize: '12px' }}>
              Task Description <span className="required-asterisk">*</span>
            </label>
            <textarea
              id="task-desc-input"
              placeholder="Detail out individual tasks and submission formats..."
              rows={3}
              className={`form-input ${localErrors.description ? 'input-error' : ''}`}
              style={{ height: 'auto', padding: '10px 12px', fontSize: '13px' }}
              value={taskDesc}
              onChange={(e) => { setTaskDesc(e.target.value); if (localErrors.description) setLocalErrors(prev => ({ ...prev, description: '' })); }}
              required
            />
            {localErrors.description && <span className="error-message" role="alert" style={{ fontSize: '11px' }}>{localErrors.description}</span>}
          </div>

          {/* Dates Grid */}
          <div className="grid-2-col" style={{ gap: '14px', marginBottom: '4px' }}>
            {/* Due Date */}
            <div className="input-group">
              <label className="form-label" htmlFor="task-due-input" style={{ fontSize: '12px' }}>
                Due Date <span className="required-asterisk">*</span>
              </label>
              <input
                type="date"
                id="task-due-input"
                className={`form-input date-input ${localErrors.dueDate ? 'input-error' : ''}`}
                style={{ height: '38px', fontSize: '13px' }}
                value={dueDate}
                onChange={(e) => { setDueDate(e.target.value); if (localErrors.dueDate) setLocalErrors(prev => ({ ...prev, dueDate: '' })); }}
                required
              />
              {localErrors.dueDate && <span className="error-message" role="alert" style={{ fontSize: '11px' }}>{localErrors.dueDate}</span>}
            </div>

            {/* Submission Date */}
            <div className="input-group">
              <label className="form-label" htmlFor="task-submit-input" style={{ fontSize: '12px' }}>
                Submission Date
              </label>
              <input
                type="date"
                id="task-submit-input"
                className="form-input date-input"
                style={{ height: '38px', fontSize: '13px' }}
                value={submissionDate}
                onChange={(e) => setSubmissionDate(e.target.value)}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="task-form-buttons">
            <button
              type="button"
              className="task-btn-ghost"
              onClick={resetForm}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="task-btn-primary"
            >
              Save Task
            </button>
          </div>
        </form>
      )}

      {/* Task List or Empty State */}
      <div className="tasks-list-scrollable" style={{ flex: 1 }}>
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onEdit={() => handleEditClick(task)}
              onDelete={() => handleDeleteClick(task.id)}
            />
          ))
        ) : (
          <div className="tasks-empty-state">
            <span className="empty-state-icon" aria-hidden="true">
              <i className="ti ti-clipboard-off" />
            </span>
            <p className="empty-state-title">No tasks assigned yet</p>
            <p className="empty-state-subtitle">Click 'Add New Task' to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskSection;
