import React, { useState, useEffect } from 'react';
import { formatDate } from '../../../utils/formatDate';

const thStyle = {
  padding: '10px 16px',
  fontSize: '12px',
  fontWeight: '500',
  color: '#757575',
  textAlign: 'left',
  borderBottom: '1px solid #E0E0E0',
  borderRight: '1px solid #F0F0F0',
  whiteSpace: 'nowrap'
};

const tdStyle = {
  padding: '10px 16px',
  fontSize: '13px',
  color: '#212121',
  borderBottom: '1px solid #F0F0F0',
  borderRight: '1px solid #F0F0F0'
};

const sectionHeading = {
  padding: '10px 16px',
  fontSize: '12px',
  fontWeight: '500',
  color: '#9E9E9E',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  borderBottom: '1px solid #E0E0E0',
  borderTop: '1px solid #E0E0E0'
};

const inProgressBadge = {
  background: '#E8F4FD',
  color: '#1565C0',
  border: '1px solid #1565C0',
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: '700',
  textTransform: 'uppercase'
};

const completedBadge = {
  background: '#E8F5E9',
  color: '#2E7D32',
  border: '1px solid #2E7D32',
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: '700',
  textTransform: 'uppercase'
};

const upcomingBadge = {
  background: '#FFF3E0',
  color: '#E65100',
  border: '1px solid #E65100',
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: '700',
  textTransform: 'uppercase'
};
const InternTasks = ({ tasks, onUpdateTaskStatus }) => {
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
    <div style={{
      width: '100%',
      minHeight: 'calc(100vh - 130px)',
      background: '#FFFFFF',
      borderRadius: '12px',
      border: '1px solid #E0E0E0',
      overflow: 'hidden',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column'
    }}>
      
      {/* Section 1: Current Active Task */}
      <div>
        <div style={{ ...sectionHeading, background: '#F8F7FF' }}>
          Current Assigned Work
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F5F5F5' }}>
                <th style={thStyle}>Task</th>
                <th style={thStyle}>Expected Date</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {activeTask ? (
                <tr style={{ background: '#EEF4FF' }}>
                  <td style={tdStyle}>{activeTask.title}</td>
                  <td style={tdStyle}>{formatDate(activeTask.expected_date)}</td>
                  <td style={tdStyle}>
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
                        height: '30px',
                        padding: '0 8px',
                        border: '1px solid #B3D7FF',
                        borderRadius: '4px',
                        fontSize: '12px',
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
                  </td>
                  <td style={tdStyle}>
                    {selectedStatus === 'completed' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="date"
                          max={new Date().toISOString().split('T')[0]}
                          value={submissionDate}
                          onChange={(e) => setSubmissionDate(e.target.value)}
                          required
                          style={{ height: '30px', padding: '0 8px', border: '1px solid #B3D7FF', borderRadius: '4px', fontSize: '12px', background: '#FFFFFF', color: '#333333' }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!submissionDate) {
                              alert('Please select a submission date.');
                              return;
                            }
                            const today = new Date().toISOString().split('T')[0];
                            if (submissionDate > today) {
                              alert('Submission date cannot be a future date.');
                              return;
                            }
                            onUpdateTaskStatus(activeTask.id, 'completed', submissionDate);
                          }}
                          style={{ height: '30px', padding: '0 12px', background: '#03DAC6', color: '#000000', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}
                        >
                          Mark Done
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#9E9E9E', fontStyle: 'italic' }}>Select Completed to submit</span>
                    )}
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={4} style={{ ...tdStyle, color: '#9E9E9E', textAlign: 'center' }}>
                    No active task in progress.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Upcoming Tasks */}
      <div>
        <div style={{ ...sectionHeading, background: '#FFF8F0' }}>
          Upcoming Tasks
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F5F5F5' }}>
                <th style={thStyle}>Task</th>
                <th style={thStyle}>Expected Date</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {upcomingTasks.length > 0 ? (
                upcomingTasks.map((task, index) => (
                  <tr key={task.id} style={{ background: index % 2 === 0 ? '#FFFFFF' : '#FFFBF5' }}>
                    <td style={tdStyle}>{task.title}</td>
                    <td style={tdStyle}>{formatDate(task.expected_date)}</td>
                    <td style={tdStyle}>
                      <span style={upcomingBadge}>Upcoming</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} style={{ ...tdStyle, color: '#9E9E9E', textAlign: 'center' }}>
                    No upcoming tasks queued.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Finished Works */}
      <div>
        <div style={{ ...sectionHeading, background: '#F0FFF4' }}>
          Finished Works
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F5F5F5' }}>
                <th style={thStyle}>Task</th>
                <th style={thStyle}>Expected Date</th>
                <th style={thStyle}>Completion Date</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {finishedTasks.length > 0 ? (
                finishedTasks.map((task, index) => (
                  <tr key={task.id} style={{ background: index % 2 === 0 ? '#FFFFFF' : '#F9FFF9' }}>
                    <td style={tdStyle}>{task.title}</td>
                    <td style={tdStyle}>{formatDate(task.expected_date)}</td>
                    <td style={tdStyle}>{formatDate(task.submission_date)}</td>
                    <td style={tdStyle}>
                      <span style={completedBadge}>Completed</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ ...tdStyle, color: '#9E9E9E', textAlign: 'center' }}>
                    No finished tasks yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default InternTasks;
