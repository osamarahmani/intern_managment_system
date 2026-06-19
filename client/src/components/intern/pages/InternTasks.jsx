import { useState, useEffect } from 'react'
import { formatDate } from '../../../utils/formatDate'
import { getTaskNotes, saveTaskNote, getSubTasksByTaskId, updateSubTaskStatus } from '../../../services/taskService'
import { getToken } from '../../../services/authService'
import RichTextEditor from '../../RichTextEditor'
import RichTextContent from '../../RichTextContent'
import { isRichTextEmpty, sanitizeRichText } from '../../../utils/richText'
import { downloadTaskReportPdf } from '../../../utils/taskReportPdf'
import useAutoRefresh from '../../../hooks/useAutoRefresh'
import { keepPreviousIfEqual } from '../../../utils/stableState'

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

const InternTasks = ({ tasks, onUpdateTaskStatus, internName }) => {
  const [activeStatusTab, setActiveStatusTab] = useState('not_started')
  const [expandedTaskId, setExpandedTaskId] = useState(null)
  const [subTaskLists, setSubTaskLists] = useState({})
  const [updatingSubTask, setUpdatingSubTask] = useState({})
  const [taskNotes, setTaskNotes] = useState({})
  const [noteInputs, setNoteInputs] = useState({})
  const [savingNote, setSavingNote] = useState({})
  const [selectedStatus, setSelectedStatus] = useState({})
  const [submissionDates, setSubmissionDates] = useState({})
  const [exportingReport, setExportingReport] = useState(null)

  useAutoRefresh(async () => {
    if (!expandedTaskId) return
    const [notes, subtasks] = await Promise.all([
      getTaskNotes(expandedTaskId),
      getSubTasksByTaskId(expandedTaskId)
    ])
    setTaskNotes(prev => {
      const stableNotes = keepPreviousIfEqual(prev[expandedTaskId], notes || [])
      return stableNotes === prev[expandedTaskId] ? prev : { ...prev, [expandedTaskId]: stableNotes }
    })
    setSubTaskLists(prev => {
      const stableSubtasks = keepPreviousIfEqual(prev[expandedTaskId], subtasks || [])
      return stableSubtasks === prev[expandedTaskId] ? prev : { ...prev, [expandedTaskId]: stableSubtasks }
    })
  }, 10000, Boolean(expandedTaskId))

  useEffect(() => {
    const statusMap = {}
    const dateMap = {}
    tasks.forEach(t => {
      statusMap[t.id] = t.status || 'not_started'
      dateMap[t.id] = t.submission_date || ''
    })
    setSelectedStatus(statusMap)
    setSubmissionDates(dateMap)
  }, [tasks])

  const handleToggleExpand = async (taskId) => {
    const isOpening = expandedTaskId !== taskId
    setExpandedTaskId(isOpening ? taskId : null)
    if (isOpening) {
      if (!taskNotes[taskId]) {
        try {
          const notes = await getTaskNotes(taskId)
          setTaskNotes(prev => ({ ...prev, [taskId]: notes || [] }))
        } catch {}
      }
      if (!subTaskLists[taskId]) {
        try {
          const subs = await getSubTasksByTaskId(taskId)
          setSubTaskLists(prev => ({ ...prev, [taskId]: subs || [] }))
        } catch {}
      }
    }
  }

  const handleSubTaskStatusChange = async (taskId, subtaskId, newStatus) => {
    setUpdatingSubTask(prev => ({ ...prev, [subtaskId]: true }))
    try {
      const result = await updateSubTaskStatus(subtaskId, newStatus)
      setSubTaskLists(prev => ({
        ...prev,
        [taskId]: (prev[taskId] || []).map(s => s.id === subtaskId ? { ...s, status: newStatus } : s)
      }))
      // If backend auto-completed the parent task, reflect it
      if (result.parentAutoCompleted) {
        onUpdateTaskStatus(taskId, 'completed', new Date().toISOString().split('T')[0])
      }
    } catch (err) {
      alert('Failed to update subtask: ' + err.message)
    } finally {
      setUpdatingSubTask(prev => ({ ...prev, [subtaskId]: false }))
    }
  }

  const handleSaveNote = async (taskId) => {
    const note = sanitizeRichText(noteInputs[taskId] || '')
    if (isRichTextEmpty(note)) return
    setSavingNote(prev => ({ ...prev, [taskId]: true }))
    try {
      await saveTaskNote(taskId, { note }, getToken())
      const refreshed = await getTaskNotes(taskId)
      setTaskNotes(prev => ({ ...prev, [taskId]: refreshed || [] }))
      setNoteInputs(prev => ({ ...prev, [taskId]: '' }))
    } catch (err) {
      alert('Failed to save note: ' + err.message)
    } finally {
      setSavingNote(prev => ({ ...prev, [taskId]: false }))
    }
  }

  const exportSingleTask = async task => {
    setExportingReport(task.id)
    try {
      const [notes, subtasks] = await Promise.all([getTaskNotes(task.id), getSubTasksByTaskId(task.id)])
      setTaskNotes(prev => ({ ...prev, [task.id]: notes || [] }))
      setSubTaskLists(prev => ({ ...prev, [task.id]: subtasks || [] }))
      downloadTaskReportPdf({ internName, tasks: [{ ...task, notes: notes || [], subtasks: subtasks || [] }] })
    } catch (err) {
      alert('Failed to export task report: ' + err.message)
    } finally {
      setExportingReport(null)
    }
  }

  const exportAllTasks = async () => {
    setExportingReport('all')
    try {
      const reportData = await Promise.all(tasks.map(task => Promise.all([getTaskNotes(task.id), getSubTasksByTaskId(task.id)])))
      const reportTasks = tasks.map((task, index) => ({
        ...task,
        notes: reportData[index][0] || [],
        subtasks: reportData[index][1] || []
      }))
      setTaskNotes(prev => ({ ...prev, ...Object.fromEntries(reportTasks.map(task => [task.id, task.notes])) }))
      downloadTaskReportPdf({ internName, tasks: reportTasks, consolidated: true })
    } catch (err) {
      alert('Failed to export consolidated report: ' + err.message)
    } finally {
      setExportingReport(null)
    }
  }

  // Empty State (No tasks assigned)
  if (!tasks || tasks.length === 0) {
    return (
      <div className="intern-empty-state">
        <i className="ti ti-clipboard-off intern-empty-icon" aria-hidden="true" />
        <h2 className="intern-empty-title">No tasks assigned yet</h2>
        <p className="intern-empty-subtitle">Your admin will assign tasks soon</p>
      </div>
    )
  }

  const STATUS_TABS = [
    { key: 'not_started', label: 'Not Started' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'completed', label: 'Completed' }
  ]

  const filteredTasks = tasks.filter(t => (t.status || 'not_started') === activeStatusTab)

  const tabCounts = {
    not_started: tasks.filter(t => (t.status || 'not_started') === 'not_started').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length
  }

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0px' }}>

      {/* Status Tabs */}
      <div style={{
        display: 'flex', borderBottom: '2px solid #E0E0E0',
        background: '#fff', paddingLeft: '8px', alignItems: 'center', flexWrap: 'wrap'
      }}>
        {STATUS_TABS.map(tab => {
          const isActive = activeStatusTab === tab.key
          const color = tab.key === 'completed' ? '#2E7D32' : tab.key === 'in_progress' ? '#1565C0' : '#E65100'
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => { setActiveStatusTab(tab.key); setExpandedTaskId(null) }}
              style={{
                padding: '12px 20px', fontSize: '13px', fontWeight: isActive ? '700' : '500',
                color: isActive ? color : '#9E9E9E',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: isActive ? `2px solid ${color}` : '2px solid transparent',
                marginBottom: '-2px', display: 'flex', alignItems: 'center', gap: '6px',
                transition: 'color 0.15s'
              }}
            >
              {tab.label}
              <span style={{
                background: isActive ? color : '#E0E0E0',
                color: isActive ? '#fff' : '#9E9E9E',
                borderRadius: '10px', fontSize: '10px', fontWeight: '700',
                padding: '1px 7px', minWidth: '18px', textAlign: 'center'
              }}>
                {tabCounts[tab.key]}
              </span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={exportAllTasks}
          disabled={exportingReport !== null}
          style={{
            marginLeft: 'auto', marginRight: '10px', height: '34px', padding: '0 14px',
            border: '1px solid #3D35C4', borderRadius: '7px', background: '#F8F7FF',
            color: '#3D35C4', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
            opacity: exportingReport !== null ? 0.6 : 1
          }}
        >
          {exportingReport === 'all' ? 'Preparing PDF…' : '⇩ Export All Notes PDF'}
        </button>
      </div>

      {/* Empty state for tab */}
      {filteredTasks.length === 0 && (
        <div style={{ padding: '48px', textAlign: 'center', color: '#BDBDBD', fontSize: '13px', fontStyle: 'italic' }}>
          No {STATUS_TABS.find(t => t.key === activeStatusTab)?.label.toLowerCase()} tasks.
        </div>
      )}

      {filteredTasks.map((task, index) => {
        const isExpanded = expandedTaskId === task.id
        const status = selectedStatus[task.id] || task.status || 'not_started'
        const notes = taskNotes[task.id] || []

        const statusColor = status === 'completed' ? '#2E7D32' : status === 'in_progress' ? '#1565C0' : '#E65100'
        const statusBg = status === 'completed' ? '#E8F5E9' : status === 'in_progress' ? '#E8F4FD' : '#FFF3E0'
        const statusBorder = status === 'completed' ? '#2E7D32' : status === 'in_progress' ? '#1565C0' : '#E65100'
        const statusLabel = status === 'completed' ? 'COMPLETED' : status === 'in_progress' ? 'IN PROGRESS' : 'NOT STARTED'

        return (
          <div key={task.id} style={{ borderBottom: '1px solid #F0F0F0' }}>
            {/* Task Row Header - clickable to expand */}
            <div
              onClick={() => handleToggleExpand(task.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 20px', cursor: 'pointer',
                background: isExpanded ? '#F8F7FF' : '#FFFFFF',
                transition: 'background 0.15s'
              }}
            >
              {/* Index number badge */}
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: '#3D35C4', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: '700', flexShrink: 0
              }}>{index + 1}</div>

              {/* Task title */}
              <span style={{ flex: 1, fontSize: '14px', fontWeight: '500', color: '#212121' }}>
                {task.title}
              </span>

              {/* Expected date */}
              <span style={{ fontSize: '12px', color: '#9E9E9E', whiteSpace: 'nowrap', marginRight: '12px' }}>
                {formatDate(task.expected_date)}
              </span>

              {/* Status badge */}
              <span style={{
                fontSize: '10px', fontWeight: '700', padding: '3px 8px',
                borderRadius: '4px', border: `1px solid ${statusBorder}`,
                background: statusBg, color: statusColor,
                whiteSpace: 'nowrap', marginRight: '8px'
              }}>{statusLabel}</span>

              <button
                type="button"
                title="Export this task as a PDF report"
                disabled={exportingReport !== null}
                onClick={event => { event.stopPropagation(); exportSingleTask(task) }}
                style={{
                  height: '30px', padding: '0 10px', border: '1px solid #D8D5ED',
                  borderRadius: '6px', background: '#fff', color: '#3D35C4',
                  fontSize: '11px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                  opacity: exportingReport !== null ? 0.55 : 1
                }}
              >
                {exportingReport === task.id ? 'Preparing…' : '⇩ PDF'}
              </button>

              {/* Expand chevron */}
              <span style={{
                fontSize: '16px', color: '#9E9E9E',
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s', userSelect: 'none'
              }}>▾</span>
            </div>

            {/* Expanded Panel */}
            {isExpanded && (
              <div style={{ padding: '16px 20px 20px 62px', background: '#FAFAFA', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Task description if any */}
                {task.description && (
                  <RichTextContent value={task.description} />
                )}

                {/* Update Status Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Update Status
                  </span>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {['not_started', 'in_progress', 'completed'].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          setSelectedStatus(prev => ({ ...prev, [task.id]: s }))
                          if (s !== 'completed') {
                            onUpdateTaskStatus(task.id, s, null)
                          }
                        }}
                        style={{
                          height: '32px', padding: '0 14px', borderRadius: '6px', fontSize: '12px',
                          fontWeight: '600', cursor: 'pointer', border: '1px solid',
                          background: status === s ? (s === 'completed' ? '#2E7D32' : s === 'in_progress' ? '#1565C0' : '#E65100') : '#F5F5F5',
                          color: status === s ? '#fff' : '#757575',
                          borderColor: status === s ? 'transparent' : '#E0E0E0'
                        }}
                      >
                        {s === 'not_started' ? 'Not Started' : s === 'in_progress' ? 'In Progress' : 'Completed'}
                      </button>
                    ))}

                    {/* Submission date + confirm — only when completed is selected */}
                    {status === 'completed' && task.status !== 'completed' && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: '4px' }}>
                        <input
                          type="date"
                          max={new Date().toISOString().split('T')[0]}
                          value={submissionDates[task.id] || ''}
                          onChange={e => {
                            e.stopPropagation()
                            setSubmissionDates(prev => ({ ...prev, [task.id]: e.target.value }))
                          }}
                          onClick={e => e.stopPropagation()}
                          style={{ height: '32px', padding: '0 10px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '12px' }}
                        />
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation()
                            const date = submissionDates[task.id]
                            if (!date) { alert('Please select a submission date.'); return }
                            const today = new Date().toISOString().split('T')[0]
                            if (date > today) { alert('Submission date cannot be a future date.'); return }
                            onUpdateTaskStatus(task.id, 'completed', date)
                          }}
                          style={{
                            height: '32px', padding: '0 14px', background: '#03DAC6',
                            color: '#000', border: 'none', borderRadius: '6px',
                            fontWeight: '700', fontSize: '12px', cursor: 'pointer'
                          }}
                        >Mark Done</button>
                      </div>
                    )}

                    {/* Already completed — show submission date */}
                    {task.status === 'completed' && task.submission_date && (
                      <span style={{ fontSize: '12px', color: '#2E7D32', marginLeft: '4px' }}>
                        ✓ Submitted on {formatDate(task.submission_date)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Notes Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    📝 My Notes
                  </span>

                  {/* Existing notes */}
                  {notes.length === 0 ? (
                    <p style={{ margin: 0, fontSize: '13px', color: '#BDBDBD', fontStyle: 'italic' }}>No notes added yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {notes.map((n, i) => (
                        <div key={i} style={{
                          padding: '10px 12px', background: '#FFFDE7',
                          borderRadius: '6px', border: '1px solid #FFF9C4'
                        }}>
                          <RichTextContent value={n.note} />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new note */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <RichTextEditor
                      placeholder="Add a note about your progress..."
                      value={noteInputs[task.id] || ''}
                      onChange={note => setNoteInputs(prev => ({ ...prev, [task.id]: note }))}
                      disabled={savingNote[task.id]}
                    />
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); handleSaveNote(task.id) }}
                      disabled={savingNote[task.id]}
                      style={{
                        height: '36px', padding: '0 16px', background: '#3D35C4',
                        color: '#fff', border: 'none', borderRadius: '6px',
                        fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                        whiteSpace: 'nowrap', opacity: savingNote[task.id] ? 0.7 : 1
                      }}
                    >
                      {savingNote[task.id] ? 'Saving...' : 'Save Note'}
                    </button>
                  </div>
                </div>

                {/* Sub Tasks (read-only for intern) */}
                {subTaskLists[task.id] && subTaskLists[task.id].length > 0 && (
                  <div>
                    <p style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: 700, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Sub Tasks ({subTaskLists[task.id].length})
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {subTaskLists[task.id].map((sub, i) => {
                        const subColor = sub.status === 'completed' ? '#2E7D32' : sub.status === 'in_progress' ? '#1565C0' : '#E65100'
                        const subBg = sub.status === 'completed' ? '#E8F5E9' : sub.status === 'in_progress' ? '#E3F2FD' : '#FFF3E0'
                        return (
                          <div key={sub.id} style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 12px', background: '#FAFAFA',
                            borderRadius: '6px', border: '1px solid #F0F0F0'
                          }}>
                            <span style={{
                              width: '18px', height: '18px', borderRadius: '50%',
                              background: '#E0E0E0', color: '#757575',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '9px', fontWeight: 700, flexShrink: 0
                            }}>{i + 1}</span>
                            <div style={{ flex: 1 }}>
                              <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#212121' }}>{sub.title}</p>
                              {sub.description && (
                                <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#9E9E9E' }}>{sub.description}</p>
                              )}
                            </div>
                            {sub.expected_date && (
                              <span style={{ fontSize: '10px', color: '#9E9E9E', whiteSpace: 'nowrap' }}>{formatDate(sub.expected_date)}</span>
                            )}
                            <span style={{
                              fontSize: '9px', fontWeight: 700, padding: '2px 8px',
                              borderRadius: '4px', background: subBg, color: subColor, whiteSpace: 'nowrap'
                            }}>
                              {sub.status.replace('_', ' ').toUpperCase()}
                            </span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {['not_started', 'in_progress', 'completed'].map(s => (
                                <button
                                  key={s}
                                  type="button"
                                  disabled={updatingSubTask[sub.id]}
                                  onClick={() => handleSubTaskStatusChange(task.id, sub.id, s)}
                                  style={{
                                    height: '22px', padding: '0 7px', borderRadius: '4px',
                                    fontSize: '9px', fontWeight: 600, cursor: 'pointer', border: '1px solid',
                                    background: sub.status === s ? subColor : '#fff',
                                    color: sub.status === s ? '#fff' : '#9E9E9E',
                                    borderColor: sub.status === s ? 'transparent' : '#E0E0E0',
                                    opacity: updatingSubTask[sub.id] ? 0.6 : 1
                                  }}
                                >
                                  {s === 'not_started' ? '✗' : s === 'in_progress' ? '⟳' : '✓'}
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default InternTasks
