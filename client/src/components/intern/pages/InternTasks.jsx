import React, { useState, useEffect } from 'react';

const InternTasks = ({ tasks, onUpdateTaskStatus }) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const options = { year: 'numeric', month: 'short', day: 'numeric' };
      return new Date(dateStr).toLocaleDateString(undefined, options);
    } catch (e) {
      return dateStr;
    }
  };

  // Find the current active task: earliest task that is not completed
  const activeTask = tasks.find((t) => t.status !== 'completed');

  // Find upcoming tasks: not completed, and not the active task
  const upcomingTasks = tasks.filter((t) => t.status !== 'completed' && t.id !== activeTask?.id);

  // Find finished tasks: status is completed
  const finishedTasks = tasks.filter((t) => t.status === 'completed');

  // Local state for Section 1 current task status & submission date
  const [selectedStatus, setSelectedStatus] = useState('in_progress');
  const [submissionDate, setSubmissionDate] = useState('');

  // Sync state with active task
  useEffect(() => {
    if (activeTask) {
      setSelectedStatus(activeTask.status || 'in_progress');
      setSubmissionDate(activeTask.submission_date || new Date().toISOString().split('T')[0]);
    }
  }, [activeTask?.id]);

  // Helper for status styling classes
  const getStatusClass = (status) => {
    switch (status) {
      case 'in_progress':
        return 'status-in-progress';
      case 'completed':
        return 'status-completed';
      case 'not_started':
      default:
        return 'status-not-started';
    }
  };

  // Helper to format status text nicely
  const getStatusLabel = (status) => {
    switch (status) {
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'not_started':
      default:
        return 'Not Started';
    }
  };

  // Empty State (No tasks assigned)
  if (!tasks || tasks.length === 0) {
    return (
      <div className="intern-empty-state">
        <i className="ti ti-clipboard-off intern-empty-icon" aria-hidden="true" />
        <h2 className="intern-empty-title">No tasks assigned yet</h2>
        <p className="intern-empty-subtitle">Your admin will assign tasks soon</p>
      </div>
    );
  }

  return (
    <div className="tasks-page-wrapper">
      {/* Tasks Header Row */}
      <div className="tasks-page-header" style={{ marginBottom: '24px' }}>
        <h2 className="tasks-page-title" style={{ fontSize: '24px', fontWeight: '700', color: '#111111', margin: 0 }}>My Tasks</h2>
        <span className="tasks-count-summary" style={{ fontSize: '14px', color: '#757575', fontWeight: '500' }}>
          {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} total
        </span>
      </div>

      {/* Section 1: Current Active Task */}
      <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '12px', border: '1px solid #E0E0E0', boxShadow: '0 2px 12px rgba(0,0,0,0.01)', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#212121', marginBottom: '16px', marginTop: 0 }}>Current Active Task</h3>
        {activeTask ? (
          <div style={{ background: '#E8F4FD', padding: '20px', border: '1px solid #B3D7FF', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#1565C0', margin: 0 }}>{activeTask.title}</h4>
              <span className={`task-status-select ${getStatusClass(selectedStatus)}`} style={{ padding: '4px 12px', borderRadius: '12px', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase' }}>
                {getStatusLabel(selectedStatus)}
              </span>
            </div>
            
            <p style={{ fontSize: '13.5px', color: '#1565C0', margin: '0 0 16px 0' }}>
              Expected Completion Date: <strong>{formatDate(activeTask.expected_date)}</strong>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #B3D7FF', paddingTop: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '200px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#1565C0', textTransform: 'uppercase' }}>Update Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedStatus(val);
                    if (val !== 'completed') {
                      onUpdateTaskStatus(activeTask.id, val, null);
                    }
                  }}
                  style={{
                    height: '36px',
                    padding: '0 10px',
                    border: '1px solid #B3D7FF',
                    borderRadius: '6px',
                    fontSize: '13px',
                    background: '#FFFFFF',
                    color: '#1565C0',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {selectedStatus === 'completed' && (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#1565C0', textTransform: 'uppercase' }}>Submission Date</label>
                    <input
                      type="date"
                      value={submissionDate}
                      onChange={(e) => setSubmissionDate(e.target.value)}
                      required
                      style={{ height: '36px', padding: '0 10px', border: '1px solid #B3D7FF', borderRadius: '6px', fontSize: '13px', background: '#FFFFFF', color: '#333333', boxSizing: 'border-box' }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!submissionDate) {
                        alert('Please enter a submission date.');
                        return;
                      }
                      onUpdateTaskStatus(activeTask.id, 'completed', submissionDate);
                    }}
                    style={{ height: '36px', padding: '0 20px', background: '#1565C0', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}
                  >
                    Submit Work
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ background: '#FAFAFA', border: '1px dashed #E0E0E0', borderRadius: '8px', padding: '24px', textAlign: 'center' }}>
            <i className="ti ti-circle-check" style={{ fontSize: '32px', color: '#2E7D32', marginBottom: '8px', display: 'block' }} />
            <p style={{ color: '#757575', fontSize: '13.5px', margin: 0, fontWeight: '500' }}>All tasks completed! You are fully caught up.</p>
          </div>
        )}
      </div>

      {/* Section 2: Upcoming Tasks */}
      <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '12px', border: '1px solid #E0E0E0', boxShadow: '0 2px 12px rgba(0,0,0,0.01)', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#212121', marginBottom: '16px', marginTop: 0 }}>Upcoming Tasks</h3>
        {upcomingTasks.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {upcomingTasks.map((task) => (
              <div key={task.id} style={{ background: '#FFFBF5', padding: '16px', border: '1px solid #FFEED9', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#E65100', margin: '0 0 4px 0' }}>{task.title}</h4>
                  <span style={{ fontSize: '12px', color: '#757575' }}>
                    Expected Date: <strong>{formatDate(task.expected_date)}</strong>
                  </span>
                </div>
                <span style={{ fontSize: '10px', background: '#FFF3E0', color: '#E65100', border: '1px solid #E65100', padding: '2px 8px', borderRadius: '4px', fontWeight: '700', textTransform: 'uppercase' }}>
                  Upcoming
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#9E9E9E', fontSize: '13px', margin: 0 }}>No upcoming tasks queued.</p>
        )}
      </div>

      {/* Section 3: Finished Works */}
      <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '12px', border: '1px solid #E0E0E0', boxShadow: '0 2px 12px rgba(0,0,0,0.01)' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#212121', marginBottom: '16px', marginTop: 0 }}>Finished Works</h3>
        {finishedTasks.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {finishedTasks.map((task) => (
              <div key={task.id} style={{ background: '#F9FBF9', padding: '16px', border: '1px solid #E2EFE2', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#2E7D32', margin: '0 0 4px 0' }}>{task.title}</h4>
                  <span style={{ fontSize: '12px', color: '#757575' }}>
                    Completion Date: <strong>{formatDate(task.submission_date)}</strong>
                  </span>
                </div>
                <span style={{ fontSize: '10px', background: '#E8F5E9', color: '#2E7D32', border: '1px solid #2E7D32', padding: '2px 8px', borderRadius: '4px', fontWeight: '700', textTransform: 'uppercase' }}>
                  Completed
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#9E9E9E', fontSize: '13px', margin: 0 }}>No completed tasks yet.</p>
        )}
      </div>
    </div>
  );
};

export default InternTasks;
