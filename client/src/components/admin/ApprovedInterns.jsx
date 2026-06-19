import { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import apiClient from '../../utils/apiClient';
import { getToken } from '../../services/authService';
import InternAvatar from '../InternAvatar';
import * as XLSX from 'xlsx';
import { formatDate } from '../../utils/formatDate';
import {
  getAllInterns,
  getInternById,
  getInternsByBatch,
  updateIntern,
  updateInternPhoto,
  archiveIntern,
  revokeDiscontinue
} from '../../services/internService';
import { getBatches, createBatch, updateBatch, archiveBatch } from '../../services/batchService';
import { getProjectByInternId, assignProject, generateAITasks } from '../../services/projectService';
import { getTasksByInternId, assignTask, deleteTask, updateTask } from '../../services/taskService';
import { getSubTasksByTaskId, createSubTask, updateSubTaskStatus, getTaskNotes, saveTaskNote, updateTaskStatus, getAITaskDrafts, assignAITaskDraft, updateAITaskDraft } from '../../services/taskService';

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

const formatDateForInput = (dateStr) => {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
};

const ApprovedInterns = ({ batchNumber: initialBatchNumber }) => {
  // Navigation & View States
  const [activeView, setActiveView] = useState(initialBatchNumber ? 'batchDetails' : 'batches'); // 'batches' | 'batchDetails'
  const [selectedBatch, setSelectedBatch] = useState(initialBatchNumber ? { batch_number: initialBatchNumber } : null);
  const [selectedIntern, setSelectedIntern] = useState(null);

  // Split Panel Resizing States & Refs
  const [leftWidth, setLeftWidth] = useState(340);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);
  const dragRef = useRef(null);
  const fileInputRef = useRef(null);
  const mdFileInputRef = useRef(null);

  // Database Record States
  const [batches, setBatches] = useState([]);
  const [interns, setInterns] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);

  // Provision Batch Form States
  const [batchNumber, setBatchNumber] = useState('');
  const [registrationKey, setRegistrationKey] = useState('');
  const [visibleKeyBatchId, setVisibleKeyBatchId] = useState(null);
  const [copiedBatchId, setCopiedBatchId] = useState(null);

  // Assign Project Form States
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectGit, setProjectGit] = useState('');
  const [projectLive, setProjectLive] = useState('');

  // Redesigned Task Form States
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'project' | 'tasks'
  const [assignWork, setAssignWork] = useState('');
  const [expectedDate, setExpectedDate] = useState('');

  // Feature 1 States
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDate, setEditTaskDate] = useState('');

  // Feature 2 States
  const [showProjectForm, setShowProjectForm] = useState(false);

  // Feature 3 States
  const [aiGeneratedTasks, setAiGeneratedTasks] = useState([]);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showAiTaskReview, setShowAiTaskReview] = useState(false);

  // Details Tab States
  const [editedIntern, setEditedIntern] = useState(null);
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsSaved, setDetailsSaved] = useState(false);

  // UI Feedback Alerts
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [savedVisibility, setSavedVisibility] = useState({});
  const [exportLoading, setExportLoading] = useState(false);

  // Batch Summary Card States
  const [summaryBatch, setSummaryBatch] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryStats, setSummaryStats] = useState({
    totalInterns: 0,
    internsWithProject: 0,
    internsWithoutProject: 0,
    avgDaysRemaining: 0,
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    notStartedTasks: 0,
    overdueTasks: 0,
    completionRate: 0,
    topPerformer: null,
    topPerformerCount: 0,
    hasInterns: false
  });

  const [aiLoading, setAiLoading] = useState(false)
  const [aiTasks, setAiTasks] = useState([])
  const [showAiModal, setShowAiModal] = useState(false)
  const [expandedTaskId, setExpandedTaskId] = useState(null)
  const [expandedNotesTaskId, setExpandedNotesTaskId] = useState(null)
  const [taskStatusTab, setTaskStatusTab] = useState('not_started')
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [showDiscontinueModal, setShowDiscontinueModal] = useState(false)
  const [showRevokeModal, setShowRevokeModal] = useState(false)
  const [isEditingFeedback, setIsEditingFeedback] = useState(false)
  const [feedbackForm, setFeedbackForm] = useState({ rating: 0, feedback: '' })
  const [discontinueReason, setDiscontinueReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [subTaskForms, setSubTaskForms] = useState({})
  const [subTaskLists, setSubTaskLists] = useState({})
  const [taskSubTasks, setTaskSubTasks] = useState({})
  const [taskNotes, setTaskNotes] = useState({})
  const [aiDraftsExist, setAiDraftsExist] = useState(false)
  const [editingDraftId, setEditingDraftId] = useState(null)
  const [editDraftForm, setEditDraftForm] = useState({ title: '', description: '', expected_date: '' })
  const [showDateRangeModal, setShowDateRangeModal] = useState(false)
  const [genStartDate, setGenStartDate] = useState('')
  const [genEndDate, setGenEndDate] = useState('')

  useEffect(() => {
    if (selectedIntern) {
      getAITaskDrafts(selectedIntern.id).then(drafts => {
        const hasUnassigned = drafts.some(d => !d.is_assigned)
        setAiDraftsExist(hasUnassigned)
        if (hasUnassigned) setAiTasks(drafts)
      }).catch(() => { })
    }
  }, [selectedIntern])

  // Sync internal navigation with browser history
  useEffect(() => {
    if (!window.history.state ||
      window.history.state.activeView !== activeView ||
      window.history.state.selectedBatchId !== selectedBatch?.id) {
      window.history.pushState({
        ...window.history.state,
        activeView,
        selectedBatchId: selectedBatch?.id,
        selectedBatchNumber: selectedBatch?.batch_number
      }, '');
    }
  }, [activeView, selectedBatch]);

  useEffect(() => {
    const handlePop = (e) => {
      if (e.state) {
        if (e.state.activeView) {
          setActiveView(e.state.activeView);
        }
        if (e.state.selectedBatchId) {
          const matched = batches.find(b => b.id === e.state.selectedBatchId || b.batch_number === e.state.selectedBatchNumber);
          if (matched) {
            setSelectedBatch(matched);
          } else {
            setSelectedBatch(null);
          }
        } else {
          setSelectedBatch(null);
        }
      }
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [batches]);

  // Load latest batch stats on page load
  useEffect(() => {
    if (batches.length > 0 && !summaryBatch) {
      setSummaryBatch(batches[0]);
    }
  }, [batches]);

  const fetchBatchSummary = async (batchNum) => {
    setSummaryLoading(true);
    try {
      // 1. Fetch interns in batch
      const batchInterns = await getInternsByBatch(batchNum);

      const safeInterns = batchInterns || [];
      const internIds = safeInterns.map(i => i.id);

      if (internIds.length === 0) {
        setSummaryStats({
          totalInterns: 0,
          internsWithProject: 0,
          internsWithoutProject: 0,
          avgDaysRemaining: 0,
          totalTasks: 0,
          completedTasks: 0,
          inProgressTasks: 0,
          notStartedTasks: 0,
          overdueTasks: 0,
          completionRate: 0,
          topPerformer: null,
          topPerformerCount: 0,
          hasInterns: false
        });
        return;
      }

      // 2. Fetch tasks for those interns
      const tasksData = await Promise.all(internIds.map(id => getTasksByInternId(id)));
      const batchTasks = tasksData.flat();

      // 3. Fetch projects for those interns
      const projectsData = await Promise.all(internIds.map(id => getProjectByInternId(id)));
      const batchProjects = projectsData.filter(Boolean);

      const safeTasks = batchTasks || [];
      const safeProjects = batchProjects || [];

      // Computed Stats
      const today = new Date().toISOString().split('T')[0];

      // Intern stats
      const totalInterns = safeInterns.length;
      const internsWithProject = safeProjects.length;
      const internsWithoutProject = totalInterns - internsWithProject;
      const avgDaysRemaining = totalInterns > 0
        ? Math.round(
          safeInterns.reduce((sum, i) => {
            const endingDateStr = i.ending_date || i.endingDate;
            const endingDate = endingDateStr ? new Date(endingDateStr) : null;
            const diff = (endingDate && !isNaN(endingDate.getTime()))
              ? Math.max(0, Math.ceil((endingDate - new Date()) / (1000 * 60 * 60 * 24)))
              : 0;
            return sum + diff;
          }, 0) / totalInterns
        )
        : 0;

      // Task stats
      const totalTasks = safeTasks.length;
      const completedTasks = safeTasks.filter(t => t.status === 'completed').length;
      const inProgressTasks = safeTasks.filter(t => t.status === 'in_progress').length;
      const notStartedTasks = safeTasks.filter(t => t.status === 'not_started').length;
      const overdueTasks = safeTasks.filter(t =>
        t.status !== 'completed' && t.expected_date && t.expected_date < today
      ).length;
      const completionRate = totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : 0;

      // Top performer
      const completedByIntern = {};
      safeTasks
        .filter(t => t.status === 'completed')
        .forEach(t => {
          completedByIntern[t.intern_id] = (completedByIntern[t.intern_id] || 0) + 1;
        });
      const topInternId = Object.entries(completedByIntern)
        .sort((a, b) => b[1] - a[1])[0]?.[0];
      const topPerformer = safeInterns.find(i => i.id === topInternId);
      const topPerformerCount = completedByIntern[topInternId] || 0;

      setSummaryStats({
        totalInterns,
        internsWithProject,
        internsWithoutProject,
        avgDaysRemaining,
        totalTasks,
        completedTasks,
        inProgressTasks,
        notStartedTasks,
        overdueTasks,
        completionRate,
        topPerformer,
        topPerformerCount,
        hasInterns: true
      });

    } catch (err) {
      console.error('Error fetching batch summary:', err.message);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleExport = async (batchNumber = null) => {
    setExportLoading(true);
    try {
      // 1. Fetch interns
      let interns;
      if (batchNumber) {
        interns = await getInternsByBatch(batchNumber);
      } else {
        const all = await getAllInterns();
        interns = all.filter(i => i.status === 'approved');
      }

      if (!interns || interns.length === 0) {
        alert('No interns found to export.');
        setExportLoading(false);
        return;
      }

      const internIds = interns.map(i => i.id);

      // 2. Fetch projects
      const projectsData = await Promise.all(internIds.map(id => getProjectByInternId(id)));
      const projects = projectsData.filter(Boolean);

      // 3. Fetch tasks
      const tasksData = await Promise.all(internIds.map(id => getTasksByInternId(id)));
      const tasks = tasksData.flat();

      // 4. Build lookup maps
      const internMap = {};
      interns.forEach(i => { internMap[i.id] = i; });

      // 5. Sheet 1 — Interns
      const internSheet = interns.map(i => ({
        'Name': i.name,
        'Email': i.mail,
        'Phone': i.number,
        'College': i.college_name,
        'Department': i.dept,
        'Year': i.year,
        'Semester': i.sem,
        'Batch': i.batch_number,
        'Starting Date': i.starting_date,
        'Ending Date': i.ending_date,
        'Status': i.status
      }));

      // 6. Sheet 2 — Projects
      const projectSheet = (projects || []).map(p => ({
        'Intern Name': internMap[p.intern_id]?.name || '—',
        'Batch': internMap[p.intern_id]?.batch_number || '—',
        'Project Title': p.title,
        'Description': p.description,
        'Git Repo': p.git_repo_link || '—',
        'Live Link': p.live_project_link || '—'
      }));

      // 7. Sheet 3 — Tasks
      const taskSheet = (tasks || []).map(t => ({
        'Intern Name': internMap[t.intern_id]?.name || '—',
        'Batch': internMap[t.intern_id]?.batch_number || '—',
        'Task Title': t.title,
        'Expected Date': t.expected_date,
        'Submission Date': t.submission_date || '—',
        'Status': t.status,
        'Upcoming Task': t.upcoming_task || '—'
      }));

      // 8. Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(internSheet), 'Interns');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(projectSheet), 'Projects');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(taskSheet), 'Tasks');

      // 9. File name
      const fileName = batchNumber
        ? `Batch_${batchNumber}_Export_${new Date().toISOString().split('T')[0]}.xlsx`
        : `All_Batches_Export_${new Date().toISOString().split('T')[0]}.xlsx`;

      XLSX.writeFile(wb, fileName);
    } catch (err) {
      alert('Export failed: ' + err.message);
    } finally {
      setExportLoading(false);
    }
  };

  useEffect(() => {
    if (summaryBatch) {
      fetchBatchSummary(summaryBatch.batch_number);
    }
  }, [summaryBatch]);

  // Helper Resets
  const resetProjectForm = () => {
    setProjectTitle('');
    setProjectDesc('');
    setProjectGit('');
    setProjectLive('');
  };

  const resetTaskForm = () => {
    setAssignWork('');
    setExpectedDate('');
  };

  // ==========================================================================
  // Effect hooks to handle reactive data loading
  // ==========================================================================

  // 1. Fetch batches list upon component mount
  useEffect(() => {
    fetchBatches();
  }, []);

  // 2. Fetch interns reactively when the selected batch changes
  useEffect(() => {
    if (selectedBatch) {
      fetchInternsForBatch(selectedBatch.batch_number);
      setSelectedIntern(null); // Reset active intern panel
      setActiveTab('details');
    }
  }, [selectedBatch]);

  // 3. Fetch projects and tasks reactively when the active selected intern changes
  useEffect(() => {
    if (selectedIntern) {
      fetchInternDetails(selectedIntern.id);
      // Reset forms
      resetProjectForm();
      resetTaskForm();
      setShowProjectForm(false);
      setShowAiTaskReview(false);
      setAiGeneratedTasks([]);
      setActiveTab('details');
    }
  }, [selectedIntern]);

  // 4. Populate editedIntern when selectedIntern changes
  useEffect(() => {
    if (selectedIntern) {
      setEditedIntern({
        ...selectedIntern,
        starting_date: formatDateForInput(selectedIntern.starting_date),
        ending_date: formatDateForInput(selectedIntern.ending_date)
      });
      setDetailsSaved(false);
    }
  }, [selectedIntern]);

  // 5. Handle Resizable Split Panel dragging events
  const handleMouseDown = (e) => {
    setIsDragging(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !containerRef.current) return;
      const containerLeft = containerRef.current.getBoundingClientRect().left;
      const newWidth = e.clientX - containerLeft;
      // Clamp between 220px and 500px
      const clamped = Math.min(500, Math.max(220, newWidth));
      setLeftWidth(clamped);
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Save handler for Details Tab
  const handleSaveDetails = async () => {
    if (!editedIntern || !selectedIntern) return;
    setSavingDetails(true);
    setDetailsSaved(false);
    try {
      const current = await getInternById(selectedIntern.id);
      const merged = {
        ...current,
        name: editedIntern.name,
        college_name: editedIntern.college_name,
        dept: editedIntern.dept,
        year: parseInt(editedIntern.year, 10),
        sem: parseInt(editedIntern.sem, 10),
        mail: editedIntern.mail,
        number: editedIntern.number,
        starting_date: editedIntern.starting_date,
        ending_date: editedIntern.ending_date,
        batch_number: editedIntern.batch_number
      };
      await updateIntern(selectedIntern.id, merged);

      // Update local interns list state
      setInterns((prev) =>
        prev.map((i) => (i.id === selectedIntern.id ? { ...i, ...editedIntern } : i))
      );
      // Keep selectedIntern reference in sync
      setSelectedIntern(editedIntern);
      setDetailsSaved(true);
      setTimeout(() => setDetailsSaved(false), 3000);
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSavingDetails(false);
    }
  };

  const handleArchive = async () => {
    if (!selectedIntern) return;
    if (window.confirm("Are you sure you want to archive this intern? They will lose access but their data will be preserved.")) {
      try {
        await archiveIntern(selectedIntern.id);
        // Remove intern from active list
        setInterns((prev) => prev.filter((i) => i.id !== selectedIntern.id));
        // Reset active intern panel
        setSelectedIntern(null);
        alert("Intern archived successfully.");
      } catch (err) {
        alert("Failed to archive intern: " + err.message);
      }
    }
  };

  const handlePhotoUpload = async (file) => {
    if (!selectedIntern || !file) return
    try {
      await updateInternPhoto(selectedIntern.id, file)
      const updatedIntern = { ...selectedIntern, _photoBust: Date.now() }
      setSelectedIntern(updatedIntern)
      setInterns(prev => prev.map(i => i.id === selectedIntern.id ? updatedIntern : i))
      alert('Profile photo updated successfully!')
    } catch (err) {
      alert('Photo upload failed: ' + err.message)
    }
  };

  const handlePhotoClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      await handlePhotoUpload(file);
    }
  };

  const handleMdFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setProjectDesc(event.target.result);
    };
    reader.onerror = () => {
      alert('Failed to read the markdown file.');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ==========================================================================
  // Fetch Functions
  // ==========================================================================

  const fetchBatches = async () => {
    try {
      const data = await getBatches();
      if (data) {
        setBatches(data);
        if (initialBatchNumber) {
          const matched = data.find(b => b.batch_number === initialBatchNumber);
          setSelectedBatch(matched || { batch_number: initialBatchNumber });
          setActiveView('batchDetails');
        }
      }
    } catch (err) {
      console.error('Error fetching batches:', err.message);
    }
  };

  const fetchInternsForBatch = async (batchNum) => {
    try {
      const data = await getInternsByBatch(batchNum);
      if (data) setInterns(data);
    } catch (err) {
      console.error('Error fetching interns:', err.message);
    }
  };

  const fetchInternDetails = async (internId) => {
    try {
      // Fetch projects
      const projData = await getProjectByInternId(internId);
      setProjects(projData ? [projData] : []);

      // Prefill project form states reactively
      if (projData) {
        setProjectTitle(projData.title || '');
        setProjectDesc(projData.description || '');
        setProjectGit(projData.git_repo_link || '');
        setProjectLive(projData.live_project_link || '');
      } else {
        resetProjectForm();
      }

      // Fetch tasks
      const taskData = await getTasksByInternId(internId);
      if (taskData) {
        taskData.reverse();
        setTasks(taskData);
      } else {
        setTasks([]);
      }
    } catch (err) {
      console.error('Error fetching intern assignments:', err.message);
    }
  };

  const handleGenerateKey = () => {
    if (!batchNumber.trim()) return;

    const today = new Date();
    const dateStr = today.getFullYear().toString() +
      String(today.getMonth() + 1).padStart(2, '0') +
      String(today.getDate()).padStart(2, '0');

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomStr = '';
    for (let i = 0; i < 6; i++) {
      randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const batchCode = batchNumber.trim().toUpperCase().replace(/\s+/g, '');
    const key = `${dateStr}-${randomStr}-${batchCode}`;
    setRegistrationKey(key);
  };

  // ==========================================================================
  // Form Submission Handlers
  // ==========================================================================

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!batchNumber.trim() || !registrationKey.trim()) {
      setErrorMsg('Both Batch Number and Registration Key are required.');
      return;
    }

    try {
      const data = await createBatch({
        batch_number: batchNumber.trim(),
        registration_key: registrationKey.trim()
      });

      setSuccessMsg(`Batch "${batchNumber}" provisioned successfully!`);
      setBatches((prev) => [data, ...prev]);
      setBatchNumber('');
      setRegistrationKey('');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create batch. Identifier may already exist.');
    }
  };

  const handleToggleBatchStatus = async (batch) => {
    const updatedStatus = !batch.is_active;
    try {
      await updateBatch(batch.id, {
        is_active: updatedStatus,
        visibility_mode: batch.visibility_mode
      });

      setBatches((prev) =>
        prev.map((b) => (b.id === batch.id ? { ...b, is_active: updatedStatus } : b))
      );
    } catch (err) {
      alert(`Status toggle failed: ${err.message}`);
    }
  };

  const handleUpdateVisibilityMode = async (batchId, mode) => {
    try {
      await updateBatch(batchId, {
        is_active: batches.find(b => b.id === batchId)?.is_active ?? true,
        visibility_mode: mode
      });

      setBatches((prev) =>
        prev.map((b) => (b.id === batchId ? { ...b, visibility_mode: mode } : b))
      );

      setSavedVisibility((prev) => ({ ...prev, [batchId]: true }));
      setTimeout(() => {
        setSavedVisibility((prev) => ({ ...prev, [batchId]: false }));
      }, 2000);
    } catch (err) {
      alert('Failed to save visibility mode: ' + err.message);
    }
  };

  const handleArchiveBatch = async (batch) => {
    if (!window.confirm(`Archive batch "${batch.batch_number}"? It will be hidden from batch management and registration, but existing intern data will be preserved.`)) {
      return;
    }

    try {
      await archiveBatch(batch.id);
      setBatches((prev) => prev.filter((b) => b.id !== batch.id));
      if (summaryBatch?.id === batch.id) {
        setSummaryBatch(null);
      }
      if (selectedBatch?.id === batch.id) {
        setSelectedBatch(null);
        setActiveView('batches');
      }
      alert('Batch archived successfully.');
    } catch (err) {
      alert(`Archive batch failed: ${err.message}`);
    }
  };

  const handleAssignProject = async (e) => {
    e.preventDefault();
    if (!selectedIntern) return;

    if (!projectTitle.trim() || !projectDesc.trim()) {
      alert('Project Title and Description are required.');
      return;
    }

    const wasFirstAssignment = projects.length === 0;

    try {
      const data = await assignProject({
        intern_id: selectedIntern.id,
        title: projectTitle.trim(),
        description: projectDesc.trim(),
        git_repo_link: projectGit.trim(),
        live_project_link: projectLive.trim()
      });

      alert('Project assigned/updated successfully!');
      setProjects([data]);
      setShowProjectForm(false);
      setProjectTitle(data.title || '');
      setProjectDesc(data.description || '');
      setProjectGit(data.git_repo_link || '');
      setProjectLive(data.live_project_link || '');

      if (wasFirstAssignment) {
        setGenStartDate(formatDateForInput(selectedIntern.starting_date))
        setGenEndDate(formatDateForInput(selectedIntern.ending_date))
        setShowDateRangeModal(true)
        setActiveTab('tasks')
      }
    } catch (err) {
      alert(`Project assignment failed: ${err.message}`);
    }
  };

  const handleAssignTask = async (e) => {
    e.preventDefault();
    if (!selectedIntern) return;

    if (!assignWork.trim() || !expectedDate) {
      alert('Assign Work and Expected date are required.');
      return;
    }

    try {
      const data = await assignTask({
        intern_id: selectedIntern.id,
        title: assignWork.trim(),
        expected_date: expectedDate,
        upcoming_task: false
      });

      alert('Task assigned successfully!');
      setTasks((prev) => {
        const updated = [...prev, data]
        return updated.sort((a, b) => new Date(a.expected_date) - new Date(b.expected_date))
      });
      resetTaskForm();
    } catch (err) {
      alert(`Task assignment failed: ${err.message}`);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await deleteTask(taskId);

      alert('Task deleted successfully!');
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      alert(`Failed to delete task: ${err.message}`);
    }
  };

  const handleSaveTaskEdit = async (taskId) => {
    try {
      await updateTask(taskId, {
        title: editTaskTitle,
        expected_date: editTaskDate
      })
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, title: editTaskTitle, expected_date: editTaskDate } : t))
      setEditingTaskId(null)
    } catch (err) {
      alert('Failed to update task: ' + err.message)
    }
  }

  const handleConfirmAiTask = async (aiTask) => {
    try {
      const data = await assignTask({
        intern_id: selectedIntern.id,
        title: aiTask.title,
        expected_date: aiTask.expected_date,
        upcoming_task: false
      })
      setTasks(prev => {
        const updated = [...prev, data]
        return updated.sort((a, b) => new Date(a.expected_date) - new Date(b.expected_date))
      })
      setAiGeneratedTasks(prev => prev.map(t => t._tempId === aiTask._tempId ? { ...t, _confirmed: true } : t))
    } catch (err) {
      alert('Failed to assign task: ' + err.message)
    }
  }

  const handleCompleteInternship = async () => {
    if (!feedbackForm.rating) { alert('Please select a rating.'); return }
    if (!feedbackForm.feedback.trim()) { alert('Please enter feedback.'); return }
    setActionLoading(true)
    const token = getToken()
    try {
      await apiClient(`/api/interns/${selectedIntern.id}/complete`, {
        method: 'PUT',
        body: JSON.stringify({ rating: feedbackForm.rating, feedback: feedbackForm.feedback.trim() })
      }, token)
      setShowFeedbackModal(false)
      const isEdit = isEditingFeedback
      const nowStr = new Date().toISOString()
      const updatedRating = feedbackForm.rating
      const updatedFeedback = feedbackForm.feedback.trim()
      setFeedbackForm({ rating: 0, feedback: '' })
      alert(isEdit ? 'Feedback updated successfully.' : 'Internship marked as completed with feedback sent.')
      setSelectedIntern(prev => ({
        ...prev,
        intern_status: 'completed',
        feedback_given_at: nowStr,
        feedback_rating: updatedRating,
        feedback_text: updatedFeedback
      }))
      setInterns(prev => prev.map(i => i.id === selectedIntern.id ? {
        ...i,
        intern_status: 'completed',
        feedback_given_at: nowStr,
        feedback_rating: updatedRating,
        feedback_text: updatedFeedback
      } : i))
    } catch (err) {
      alert('Failed: ' + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDiscontinueIntern = async () => {
    if (!discontinueReason.trim()) { alert('Please enter a reason.'); return }
    setActionLoading(true)
    const token = getToken()
    const reason = discontinueReason.trim()
    try {
      await apiClient(`/api/interns/${selectedIntern.id}/discontinue`, {
        method: 'PUT',
        body: JSON.stringify({ reason })
      }, token)
      setShowDiscontinueModal(false)
      setDiscontinueReason('')
      alert('Intern marked as discontinued.')
      setSelectedIntern(prev => ({ ...prev, intern_status: 'discontinued', discontinued_reason: reason, login_blocked: true }))
      setInterns(prev => prev.map(i => i.id === selectedIntern.id ? { ...i, intern_status: 'discontinued', discontinued_reason: reason, login_blocked: true } : i))
    } catch (err) {
      alert('Failed: ' + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const openGenerateTasksModal = () => {
    if (!selectedIntern || !projects.length) return
    setGenStartDate(formatDateForInput(selectedIntern.starting_date))
    setGenEndDate(formatDateForInput(selectedIntern.ending_date))
    setShowDateRangeModal(true)
  }

  const handleConfirmGenerateAITasks = async () => {
    if (!genStartDate || !genEndDate) {
      alert('Please select both a start and end date.')
      return
    }
    if (new Date(genEndDate) < new Date(genStartDate)) {
      alert('End date cannot be before start date.')
      return
    }
    setShowDateRangeModal(false)
    setAiLoading(true)
    try {
      const result = await generateAITasks(
        projects[0].title,
        projects[0].description,
        genStartDate,
        genEndDate,
        selectedIntern.id
      )
      if (result && result.tasks && result.tasks.length > 0) {
        setAiTasks(result.tasks)
        setAiDraftsExist(true)
        setShowAiModal(true)
      } else {
        alert('AI could not generate tasks. Please try again.')
      }
    } catch (err) {
      alert('AI generation failed: ' + err.message)
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div style={{
      width: '100%',
      flex: 1,
      boxSizing: 'border-box'
    }}>

      {/* ==========================================================================
          VIEW 1: BATCH OPERATIONS DASHBOARD (DEFAULT VIEW)
          ========================================================================== */}
      {activeView === 'batches' && (
        <div style={{ height: 'calc(100vh - 104px)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: '700', color: '#111111', margin: 0 }}>Batch Management</h2>
            <button
              type="button"
              onClick={() => !exportLoading && handleExport(null)}
              disabled={exportLoading}
              style={{
                background: '#3D35C4',
                color: '#fff',
                borderRadius: '8px',
                padding: '9px 18px',
                fontSize: '13px',
                fontWeight: 600,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                border: 'none',
                cursor: exportLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: exportLoading ? 0.7 : 1,
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!exportLoading) e.currentTarget.style.background = '#2A259A';
              }}
              onMouseLeave={(e) => {
                if (!exportLoading) e.currentTarget.style.background = '#3D35C4';
              }}
            >
              {exportLoading ? 'Exporting...' : '⬇ Export All Batches'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(420px, 1.5fr)', gap: '30px', alignItems: 'start', flex: 1, minHeight: 0 }}>

            {/* Left Column: Provision New Batch & Batch Summary Card */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: 0, overflowY: 'auto', paddingRight: '4px' }}>
              {/* Create Batch Form Panel */}
              <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '12px', border: '1px solid #E0E0E0', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#212121', marginBottom: '16px', marginTop: 0 }}>Provision New Batch</h3>

                {successMsg && <div style={{ background: '#E6F4EA', color: '#137333', padding: '10px 12px', borderRadius: '6px', fontSize: '13px', marginBottom: '14px', fontWeight: '500' }}>{successMsg}</div>}
                {errorMsg && <div style={{ background: '#FCE8E6', color: '#C5221F', padding: '10px 12px', borderRadius: '6px', fontSize: '13px', marginBottom: '14px', fontWeight: '500' }}>{errorMsg}</div>}

                <form onSubmit={handleCreateBatch} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#212121' }}>
                      Batch Number
                    </label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="text"
                        placeholder="BATCH NUMBER"
                        value={batchNumber}
                        onChange={(e) => {
                          setBatchNumber(e.target.value);
                          setRegistrationKey(''); // reset key if batch name changes
                        }}
                        required
                        style={{
                          flex: 1,
                          height: '40px',
                          padding: '0 12px',
                          border: '1px solid #E0E0E0',
                          borderRadius: '6px',
                          fontSize: '14px',
                          boxSizing: 'border-box'
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleGenerateKey}
                        disabled={!batchNumber.trim()}
                        style={{
                          height: '40px',
                          padding: '0 16px',
                          background: batchNumber.trim() ? '#03DAC6' : '#F5F5F5',
                          color: batchNumber.trim() ? '#000000' : '#BDBDBD',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: '600',
                          fontSize: '13px',
                          cursor: batchNumber.trim() ? 'pointer' : 'not-allowed',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}
                      >
                        Generate Key
                      </button>
                    </div>
                  </div>

                  {registrationKey && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      background: '#F8F7FF',
                      border: '1px solid #3D35C4',
                      borderRadius: '8px',
                      padding: '10px 14px'
                    }}>
                      <i className="ti ti-key" style={{ color: '#3D35C4', fontSize: '16px' }} />
                      <span style={{
                        flex: 1,
                        fontFamily: 'monospace',
                        fontSize: '13px',
                        color: '#3D35C4',
                        fontWeight: '600',
                        letterSpacing: '0.05em'
                      }}>
                        {registrationKey}
                      </span>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(registrationKey)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#3D35C4',
                          fontSize: '13px',
                          fontWeight: '500',
                          padding: '4px 8px'
                        }}
                      >
                        Copy
                      </button>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!batchNumber.trim() || !registrationKey}
                    style={{
                      height: '40px',
                      background: (batchNumber.trim() && registrationKey) ? '#3D35C4' : '#F5F5F5',
                      color: (batchNumber.trim() && registrationKey) ? '#FFFFFF' : '#BDBDBD',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: '600',
                      fontSize: '13px',
                      cursor: (batchNumber.trim() && registrationKey) ? 'pointer' : 'not-allowed'
                    }}
                  >
                    Generate Batch
                  </button>
                </form>
              </div>

              {/* Batch Summary Card */}
              <div style={{
                background: '#fff',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                padding: '20px',
                marginTop: '16px',
                border: '1px solid #E0E0E0'
              }}>
                <h3 style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#212121',
                  marginBottom: '20px',
                  marginTop: 0
                }}>
                  📊 Batch Summary — {summaryBatch ? summaryBatch.batch_number : 'None'}
                </h3>

                {summaryLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ background: '#F5F5F5', borderRadius: '10px', height: '60px' }} />
                    <div style={{ background: '#F5F5F5', borderRadius: '10px', height: '60px' }} />
                    <div style={{ background: '#F5F5F5', borderRadius: '10px', height: '60px' }} />
                    <div style={{ background: '#F5F5F5', borderRadius: '10px', height: '60px' }} />
                  </div>
                ) : !summaryBatch ? (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '120px',
                    fontFamily: "'Roboto', sans-serif",
                    color: '#9E9E9E',
                    textAlign: 'center'
                  }}>
                    No batch selected.
                  </div>
                ) : !summaryStats.hasInterns ? (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '120px',
                    fontFamily: "'Roboto', sans-serif",
                    color: '#9E9E9E',
                    textAlign: 'center'
                  }}>
                    No approved interns in this batch yet.
                  </div>
                ) : (
                  <div>
                    {/* Section 1 — Intern Stats */}
                    <span style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#9E9E9E',
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      marginBottom: '10px',
                      display: 'block'
                    }}>
                      INTERNS
                    </span>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                      <div style={{ background: '#F3F0FF', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '24px', fontWeight: 700, color: '#3D35C4', lineHeight: 1 }}>
                          {summaryStats.totalInterns}
                        </div>
                        <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: '10px', fontWeight: 600, color: '#9E9E9E', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1.2 }}>
                          Total Interns
                        </div>
                      </div>
                      <div style={{ background: '#E8F5E9', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '24px', fontWeight: 700, color: '#2E7D32', lineHeight: 1 }}>
                          {summaryStats.internsWithProject}
                        </div>
                        <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: '10px', fontWeight: 600, color: '#9E9E9E', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1.2 }}>
                          With Project
                        </div>
                      </div>
                      <div style={{ background: '#FFF3E0', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '24px', fontWeight: 700, color: '#E65100', lineHeight: 1 }}>
                          {summaryStats.internsWithoutProject}
                        </div>
                        <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: '10px', fontWeight: 600, color: '#9E9E9E', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1.2 }}>
                          No Project Yet
                        </div>
                      </div>
                    </div>

                    <div style={{
                      background: '#F0EEFF',
                      borderRadius: '10px',
                      padding: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '10px'
                    }}>
                      <span style={{ fontFamily: "'Roboto', sans-serif", fontSize: '13px', fontWeight: 600, color: '#3D35C4' }}>
                        Avg Days Remaining
                      </span>
                      <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '20px', fontWeight: 700, color: '#3D35C4' }}>
                        {summaryStats.avgDaysRemaining} days
                      </span>
                    </div>

                    {/* Section 2 — Task Stats */}
                    <span style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#9E9E9E',
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      marginTop: '16px',
                      marginBottom: '10px',
                      display: 'block'
                    }}>
                      TASKS
                    </span>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div style={{ background: '#F3F0FF', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '24px', fontWeight: 700, color: '#3D35C4', lineHeight: 1 }}>
                          {summaryStats.totalTasks}
                        </div>
                        <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: '10px', fontWeight: 600, color: '#9E9E9E', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1.2 }}>
                          Total Tasks
                        </div>
                      </div>
                      <div style={{ background: '#E8F5E9', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '24px', fontWeight: 700, color: '#2E7D32', lineHeight: 1 }}>
                          {summaryStats.completedTasks}
                        </div>
                        <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: '10px', fontWeight: 600, color: '#9E9E9E', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1.2 }}>
                          Completed
                        </div>
                      </div>
                      <div style={{ background: '#E3F2FD', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '24px', fontWeight: 700, color: '#1565C0', lineHeight: 1 }}>
                          {summaryStats.inProgressTasks}
                        </div>
                        <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: '10px', fontWeight: 600, color: '#9E9E9E', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1.2 }}>
                          In Progress
                        </div>
                      </div>
                      <div style={{ background: '#FFF8E1', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '24px', fontWeight: 700, color: '#F9A825', lineHeight: 1 }}>
                          {summaryStats.notStartedTasks}
                        </div>
                        <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: '10px', fontWeight: 600, color: '#9E9E9E', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1.2 }}>
                          Not Started
                        </div>
                      </div>
                    </div>

                    <div style={{
                      background: summaryStats.overdueTasks > 0 ? '#FFEBEE' : '#F5F5F5',
                      borderRadius: '10px',
                      padding: '12px',
                      marginTop: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{
                        fontFamily: "'Roboto', sans-serif",
                        fontSize: '13px',
                        fontWeight: 600,
                        color: summaryStats.overdueTasks > 0 ? '#B00020' : '#9E9E9E'
                      }}>
                        ⚠️ Overdue Tasks
                      </span>
                      <span style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontSize: '20px',
                        fontWeight: 700,
                        color: summaryStats.overdueTasks > 0 ? '#B00020' : '#9E9E9E'
                      }}>
                        {summaryStats.overdueTasks}
                      </span>
                    </div>

                    {/* Section 3 — Completion Rate */}
                    <span style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#9E9E9E',
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      marginTop: '16px',
                      marginBottom: '10px',
                      display: 'block'
                    }}>
                      COMPLETION RATE
                    </span>

                    <div style={{ background: '#F9F9F9', borderRadius: '10px', padding: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: "'Roboto', sans-serif", fontSize: '13px', fontWeight: 600, color: '#212121' }}>
                          Overall Progress
                        </span>
                        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '18px', fontWeight: 700, color: '#3D35C4' }}>
                          {summaryStats.completionRate}%
                        </span>
                      </div>
                      <div style={{ height: '8px', borderRadius: '4px', background: '#E0E0E0', marginTop: '10px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${summaryStats.completionRate}%`,
                          background: summaryStats.completionRate >= 75 ? '#2E7D32' : (summaryStats.completionRate >= 40 ? '#3D35C4' : '#E65100'),
                          borderRadius: '4px',
                          height: '8px',
                          transition: 'width 0.4s ease'
                        }} />
                      </div>
                    </div>

                    {/* Section 4 — Top Performer */}
                    <span style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#9E9E9E',
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      marginTop: '16px',
                      marginBottom: '10px',
                      display: 'block'
                    }}>
                      TOP PERFORMER
                    </span>

                    {!summaryStats.topPerformer ? (
                      <div style={{
                        fontFamily: "'Roboto', sans-serif",
                        color: '#9E9E9E',
                        fontSize: '13px',
                        textAlign: 'center',
                        padding: '12px'
                      }}>
                        No completed tasks yet.
                      </div>
                    ) : (
                      <div style={{
                        background: 'linear-gradient(135deg, #F3F0FF 0%, #E8E6FF 100%)',
                        borderRadius: '10px',
                        padding: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <InternAvatar
                          internId={summaryStats.topPerformer.id}
                          name={summaryStats.topPerformer.name}
                          size={44}
                          photoBust={summaryStats.topPerformer._photoBust || ''}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px', fontWeight: 700, color: '#3D35C4' }}>
                            {summaryStats.topPerformer.name}
                          </span>
                          <span style={{ fontFamily: "'Roboto', sans-serif", fontSize: '12px', color: '#757575', marginTop: '2px' }}>
                            {summaryStats.topPerformerCount} tasks completed
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Existing Batches List Panel */}
            <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '12px', border: '1px solid #E0E0E0', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#212121', marginBottom: '16px', marginTop: 0 }}>Registered Batches ({batches.length})</h3>

              {batches.length === 0 ? (
                <p style={{ color: '#9E9E9E', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>No batches provisioned yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0, overflowY: 'auto', paddingRight: '4px' }}>
                  {batches.map((batch) => {
                    const isSelected = summaryBatch && summaryBatch.id === batch.id;
                    return (
                      <div
                        key={batch.id}
                        onClick={() => setSummaryBatch(batch)}
                        style={{
                          padding: isSelected ? '15px 19px' : '16px 20px',
                          border: isSelected ? '2px solid #3D35C4' : '1px solid #EEEEEE',
                          borderRadius: '10px',
                          background: '#FAFAFA',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        {/* Top row — batch name + toggle only */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}>
                          {/* Batch name — large, clickable */}
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBatch(batch);
                              setActiveView('batchDetails');
                            }}
                            style={{
                              fontSize: '20px',
                              fontWeight: '700',
                              color: '#3D35C4',
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              flex: 1
                            }}
                          >
                            {batch.batch_number}
                          </span>

                          {/* Toggle + label */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            flexShrink: 0
                          }}>
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleBatchStatus(batch);
                              }}
                              style={{
                                width: '48px',
                                height: '26px',
                                borderRadius: '13px',
                                background: batch.is_active ? '#3D35C4' : '#E0E0E0',
                                position: 'relative',
                                cursor: 'pointer',
                                transition: 'background 0.25s ease',
                                flexShrink: 0
                              }}
                              title={batch.is_active ? 'Click to deactivate' : 'Click to activate'}
                            >
                              <div style={{
                                position: 'absolute',
                                top: '3px',
                                left: batch.is_active ? '25px' : '3px',
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                background: '#FFFFFF',
                                transition: 'left 0.25s ease',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                              }} />
                            </div>
                            <span style={{
                              fontSize: '13px',
                              fontWeight: '500',
                              color: batch.is_active ? '#3D35C4' : '#9E9E9E',
                              minWidth: '52px'
                            }}>
                              {batch.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>

                        {/* Visibility Control Row */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          flexWrap: 'wrap',
                          borderTop: '1px solid #EEEEEE',
                          paddingTop: '12px',
                          marginTop: '4px'
                        }}>
                          <span style={{ fontSize: '12px', fontWeight: '600', color: '#000000ff' }}>
                            Profiles Visibility:
                          </span>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                            {[
                              { mode: 'public', label: 'Public' },
                              { mode: 'private', label: 'Private' },
                              { mode: 'intern_choice', label: "Intern's Choice" }
                            ].map(({ mode, label }) => {
                              const isActive = (batch.visibility_mode || 'intern_choice') === mode;
                              return (
                                <button
                                  key={mode}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateVisibilityMode(batch.id, mode);
                                  }}
                                  style={{
                                    background: isActive ? '#3D35C4' : '#F5F5F5',
                                    color: isActive ? '#FFFFFF' : '#616161',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '6px 14px',
                                    fontSize: '12px',
                                    fontWeight: isActive ? '600' : '400',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s, color 0.2s'
                                  }}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                          {savedVisibility[batch.id] && (
                            <span style={{
                              color: '#3D35C4',
                              fontSize: '12px',
                              fontWeight: '600',
                              marginLeft: '4px'
                            }}>
                              ✓ Saved
                            </span>
                          )}
                        </div>

                        {/* Bottom row — Show Key and archive actions */}
                        <div>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setVisibleKeyBatchId(
                                  visibleKeyBatchId === batch.id ? null : batch.id
                                );
                              }}
                              style={{
                                background: 'none',
                                border: '1px solid #E0E0E0',
                                borderRadius: '6px',
                                padding: '5px 12px',
                                fontSize: '12px',
                                fontWeight: '500',
                                color: '#757575',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <i className="ti ti-eye" style={{ fontSize: '14px' }} />
                              {visibleKeyBatchId === batch.id ? 'Hide Key' : 'Show Key'}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleArchiveBatch(batch);
                              }}
                              style={{
                                background: '#FFF3E0',
                                border: '1px solid #E65100',
                                borderRadius: '6px',
                                padding: '5px 12px',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#E65100',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <i className="ti ti-archive" style={{ fontSize: '14px' }} />
                              Archive Batch
                            </button>
                          </div>

                          {/* Key reveal card */}
                          {visibleKeyBatchId === batch.id && (
                            <div style={{
                              marginTop: '10px',
                              background: '#F8F7FF',
                              border: '1px solid #3D35C4',
                              borderRadius: '8px',
                              padding: '12px 16px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px'
                            }}>
                              <i className="ti ti-key" style={{ color: '#3D35C4', fontSize: '16px', flexShrink: 0 }} />

                              {/* Key text */}
                              <span style={{
                                flex: 1,
                                fontFamily: 'monospace',
                                fontSize: '13px',
                                color: '#3D35C4',
                                fontWeight: '600',
                                letterSpacing: '0.05em',
                                wordBreak: 'break-all'
                              }}>
                                {batch.registration_key}
                              </span>

                              {/* Copy button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(batch.registration_key);
                                  setCopiedBatchId(batch.id);
                                  setTimeout(() => setCopiedBatchId(null), 2000);
                                }}
                                style={{
                                  background: copiedBatchId === batch.id ? '#03DAC6' : '#3D35C4',
                                  color: copiedBatchId === batch.id ? '#000000' : '#FFFFFF',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '5px 12px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  flexShrink: 0,
                                  transition: 'background 0.2s'
                                }}
                              >
                                {copiedBatchId === batch.id ? '✓ Copied' : 'Copy'}
                              </button>

                              {/* Close button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setVisibleKeyBatchId(null);
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: '#9E9E9E',
                                  fontSize: '18px',
                                  lineHeight: 1,
                                  padding: '0 4px',
                                  flexShrink: 0
                                }}
                              >
                                ×
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ==========================================================================
          VIEW 2: BATCH DETAILS & INTERN MANAGEMENT PANEL
          ========================================================================== */}
      {activeView === 'batchDetails' && selectedBatch && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#111111', margin: 0 }}>Intern Management</h2>
              <p style={{ fontSize: '14px', color: '#757575', margin: 0 }}>Batch: <strong>{selectedBatch.batch_number}</strong></p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={() => !exportLoading && handleExport(selectedBatch.batch_number)}
                disabled={exportLoading}
                style={{
                  background: '#fff',
                  color: '#3D35C4',
                  border: '2px solid #3D35C4',
                  borderRadius: '8px',
                  padding: '7px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  cursor: exportLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: exportLoading ? 0.7 : 1,
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!exportLoading) e.currentTarget.style.background = '#F0EEFF';
                }}
                onMouseLeave={(e) => {
                  if (!exportLoading) e.currentTarget.style.background = '#fff';
                }}
              >
                {exportLoading ? 'Exporting...' : '⬇ Export Batch'}
              </button>

              <button
                onClick={() => {
                  setActiveView('batches');
                  setSelectedBatch(null);
                  setSelectedIntern(null);
                }}
                style={{
                  background: '#FFFFFF',
                  color: '#757575',
                  border: '1px solid #E0E0E0',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                ← Back to Batches
              </button>
            </div>
          </div>

          {/* Draggable Resizable Split Panel Container */}
          <div
            ref={containerRef}
            style={{
              display: 'flex',
              gap: '0',
              alignItems: 'stretch',
              width: '100%',
              overflow: 'hidden',
              height: 'calc(100vh - 180px)'
            }}
          >
            {/* Left Column: Intern List Sidebar (Resizable) */}
            <div style={{
              width: `${leftWidth}px`,
              flexShrink: 0,
              overflowY: 'auto',
              background: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E0E0E0',
              padding: '20px',
              boxSizing: 'border-box'
            }}>
              <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#212121', marginBottom: '14px', marginTop: 0 }}>Approved Interns</h3>

              {interns.length === 0 ? (
                <p style={{ color: '#9E9E9E', fontSize: '12px', textAlign: 'center', padding: '40px 0' }}>No approved interns in this batch.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {interns.map((intern) => {
                    const isSelected = selectedIntern && selectedIntern.id === intern.id;
                    const initials = intern.name
                      ? intern.name.split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase()
                      : 'IN';
                    const isApproved = intern.status === 'approved';
                    return (
                      <div
                        key={intern.id}
                        onClick={() => setSelectedIntern(intern)}
                        className={`intern-list-item ${isSelected ? 'active' : ''}`}
                      >
                        <InternAvatar
                          key={`${intern.id}-${intern._photoBust || ''}`}
                          internId={intern.id}
                          name={intern.name}
                          size={40}
                          photoBust={intern._photoBust || ''}
                        />

                        {/* Info details */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '14px', fontWeight: '500', color: '#212121', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {intern.name}
                            </span>
                            <span
                              style={{
                                fontSize: '9px',
                                background: isApproved ? '#E6F4EA' : '#FFF3E0',
                                color: isApproved ? '#137333' : '#E65100',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                flexShrink: 0
                              }}
                            >
                              {intern.status || 'approved'}
                            </span>
                          </div>
                          <span style={{ fontSize: '12px', color: '#9E9E9E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {intern.mail}
                          </span>
                          <span style={{ fontSize: '11px', color: '#BDBDBD', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {intern.dept} &bull; {intern.college_name || intern.collegeName}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Drag Handle separator */}
            <div
              ref={dragRef}
              onMouseDown={handleMouseDown}
              style={{
                width: '6px',
                flexShrink: 0,
                cursor: 'col-resize',
                background: isDragging ? '#3D35C4' : 'transparent',
                borderRadius: '3px',
                margin: '0 4px',
                transition: 'background 0.2s',
                position: 'relative',
                zIndex: 10
              }}
              title="Drag to resize"
            >
              {/* Visual indicator dots */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: '#BDBDBD'
                  }} />
                ))}
              </div>
            </div>

            {/* Right Column: Intern Management Panel (Independent Scrolling) */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              height: 'calc(100vh - 180px)',
              display: 'flex',
              flexDirection: 'column',
              background: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E0E0E0',
              boxSizing: 'border-box',
              minWidth: 0
            }}>
              {selectedIntern ? (
                <>
                  {/* Tab header — sticky at top */}
                  <div style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    background: '#FAFAFA',
                    borderBottom: '1px solid #E0E0E0',
                    flexShrink: 0
                  }}>
                    <div style={{ display: 'flex' }}>
                      {['details', 'project', 'tasks'].map(tab => {
                        return (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setActiveTab(tab)}
                            style={{
                              padding: '14px 16px',
                              background: 'none',
                              border: 'none',
                              borderBottom: activeTab === tab ? '2px solid #3D35C4' : '2px solid transparent',
                              color: activeTab === tab ? '#3D35C4' : '#757575',
                              fontWeight: activeTab === tab ? '600' : '400',
                              fontSize: '14px',
                              cursor: 'pointer',
                              outline: 'none',
                              textTransform: 'capitalize',
                              display: 'flex', alignItems: 'center', gap: '6px'
                            }}
                          >
                            {tab}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Scrollable tab content */}
                  <div style={{ flex: 1, overflowY: 'auto' }}>

                    {/* Tab Contents: Details */}
                    {activeTab === 'details' && editedIntern && (
                      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Photo section */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '20px',
                          paddingBottom: '20px',
                          borderBottom: '1px solid #F0F0F0',
                          marginBottom: '20px',
                          flexWrap: 'wrap'
                        }}>
                          {/* Left side: existing photo + name block */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            {/* Circular avatar */}
                            <InternAvatar
                              key={`${selectedIntern.id}-${selectedIntern.photo_updated_at || ''}`}
                              internId={selectedIntern.id}
                              name={selectedIntern.name}
                              size={80}
                              style={{ border: '3px solid #EEEEEE' }}
                              photoBust={selectedIntern._photoBust || ''}
                            />

                            {/* Name and dept next to photo */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{
                                fontSize: '18px',
                                fontWeight: '600',
                                color: '#212121'
                              }}>
                                {selectedIntern.name}
                              </span>
                              <span style={{
                                fontSize: '13px',
                                color: '#757575'
                              }}>
                                {selectedIntern.dept} — {selectedIntern.college_name}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                                <span style={{
                                  fontSize: '11px',
                                  background: '#E6F4EA',
                                  color: '#137333',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontWeight: '700',
                                  textTransform: 'uppercase',
                                  alignSelf: 'flex-start'
                                }}>
                                  {selectedIntern.status}
                                </span>

                                <button
                                  type="button"
                                  onClick={handlePhotoClick}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#3D35C4',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    padding: '0',
                                    textDecoration: 'underline',
                                    fontFamily: 'inherit'
                                  }}
                                >
                                  Change Photo
                                </button>
                                <input
                                  type="file"
                                  ref={fileInputRef}
                                  onChange={handlePhotoChange}
                                  accept="image/*"
                                  style={{ display: 'none' }}
                                  aria-label="Upload new profile picture"
                                />
                              </div>
                            </div>
                          </div>

                          {/* NEW: Top-right action area */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            {(() => {
                              const today = new Date(); today.setHours(0, 0, 0, 0)
                              const end = selectedIntern.ending_date ? new Date(selectedIntern.ending_date) : null
                              if (end) end.setHours(0, 0, 0, 0)
                              const isOver = end && today > end

                              if (selectedIntern.intern_status === 'discontinued') {
                                return (
                                  <>
                                    <div style={{
                                      background: '#FFF3F3', border: '1px solid #FFCDD2',
                                      borderRadius: '8px', padding: '8px 14px'
                                    }}>
                                      <p style={{ margin: 0, fontSize: '12px', color: '#B00020', fontWeight: '700' }}>⛔ Discontinued</p>
                                      <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#555' }}>{selectedIntern.discontinued_reason}</p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setShowRevokeModal(true)}
                                      style={{
                                        height: '38px', padding: '0 16px', background: '#3D35C4',
                                        color: '#fff', border: 'none', borderRadius: '8px',
                                        fontSize: '13px', fontWeight: '600', cursor: 'pointer'
                                      }}
                                    >
                                      ↩ Revoke Discontinue
                                    </button>
                                  </>
                                )
                              }

                              if (isOver) {
                                return (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const editing = !!selectedIntern.feedback_given_at
                                      setIsEditingFeedback(editing)
                                      if (editing) {
                                        let rating = selectedIntern.feedback_rating || 0
                                        let feedbackVal = selectedIntern.feedback_text || ''
                                        try {
                                          const feedbackData = await apiClient(`/api/interns/${selectedIntern.id}/feedback`, {}, getToken())
                                          if (feedbackData) {
                                            rating = feedbackData.rating
                                            feedbackVal = feedbackData.feedback
                                            setSelectedIntern(prev => ({
                                              ...prev,
                                              feedback_rating: rating,
                                              feedback_text: feedbackVal
                                            }))
                                          }
                                        } catch (err) {
                                          console.error("Failed to fetch feedback", err)
                                        }
                                        setFeedbackForm({ rating, feedback: feedbackVal })
                                      } else {
                                        setFeedbackForm({ rating: 0, feedback: '' })
                                      }
                                      setShowFeedbackModal(true)
                                    }}
                                    style={{
                                      height: '38px', padding: '0 20px', background: '#2E7D32',
                                      color: '#fff', border: 'none', borderRadius: '8px',
                                      fontSize: '13px', fontWeight: '600', cursor: 'pointer'
                                    }}
                                  >
                                    {selectedIntern.feedback_given_at ? '✏️ Edit Feedback' : '🎓 Give Feedback'}
                                  </button>
                                )
                              }

                              return (
                                <button
                                  type="button"
                                  onClick={() => setShowDiscontinueModal(true)}
                                  style={{
                                    height: '38px', padding: '0 20px', background: '#B00020',
                                    color: '#fff', border: 'none', borderRadius: '8px',
                                    fontSize: '13px', fontWeight: '600', cursor: 'pointer'
                                  }}
                                >
                                  ⛔ Discontinue Intern
                                </button>
                              )
                            })()}
                          </div>
                        </div>

                        {/* 2-column editable fields grid */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '16px'
                        }}>
                          {[
                            { label: 'Name', key: 'name', type: 'text' },
                            { label: 'College Name', key: 'college_name', type: 'text' },
                            { label: 'Department', key: 'dept', type: 'text' },
                            { label: 'Email', key: 'mail', type: 'email' },
                            { label: 'Phone Number', key: 'number', type: 'text' },
                            { label: 'Starting Date', key: 'starting_date', type: 'date' },
                            { label: 'Ending Date', key: 'ending_date', type: 'date' },
                            { label: 'Batch Number', key: 'batch_number', type: 'text' },
                          ].map(({ label, key, type }) => (
                            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={{
                                fontSize: '11px',
                                fontWeight: '600',
                                color: '#9E9E9E',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em'
                              }}>
                                {label}
                              </label>
                              <input
                                type={type}
                                value={editedIntern[key] || ''}
                                onChange={(e) => setEditedIntern(prev => ({ ...prev, [key]: e.target.value }))}
                                style={{
                                  height: '40px',
                                  padding: '0 12px',
                                  border: '1px solid #E0E0E0',
                                  borderRadius: '8px',
                                  fontSize: '13px',
                                  color: '#212121',
                                  background: '#FFFFFF',
                                  boxSizing: 'border-box',
                                  width: '100%',
                                  outline: 'none'
                                }}
                                onFocus={e => e.target.style.borderColor = '#3D35C4'}
                                onBlur={e => e.target.style.borderColor = '#E0E0E0'}
                              />
                            </div>
                          ))}

                          {/* Year dropdown */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Year</label>
                            <select
                              value={editedIntern.year || ''}
                              onChange={(e) => setEditedIntern(prev => ({ ...prev, year: e.target.value }))}
                              style={{ height: '40px', padding: '0 12px', border: '1px solid #E0E0E0', borderRadius: '8px', fontSize: '13px', color: '#212121', background: '#FFFFFF', boxSizing: 'border-box' }}
                            >
                              <option value="">Select Year</option>
                              <option value="1st Year">1st Year</option>
                              <option value="2nd Year">2nd Year</option>
                              <option value="3rd Year">3rd Year</option>
                              <option value="4th Year">4th Year</option>
                            </select>
                          </div>

                          {/* Semester dropdown */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Semester</label>
                            <select
                              value={editedIntern.sem || ''}
                              onChange={(e) => setEditedIntern(prev => ({ ...prev, sem: e.target.value }))}
                              style={{ height: '40px', padding: '0 12px', border: '1px solid #E0E0E0', borderRadius: '8px', fontSize: '13px', color: '#212121', background: '#FFFFFF', boxSizing: 'border-box' }}
                            >
                              <option value="">Select Sem</option>
                              {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                                <option key={s} value={String(s)}>{s}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Save button row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '8px', borderTop: '1px solid #F0F0F0' }}>
                          <button
                            type="button"
                            onClick={handleSaveDetails}
                            disabled={savingDetails}
                            style={{
                              height: '40px',
                              background: '#3D35C4',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '8px',
                              fontWeight: '600',
                              fontSize: '13px',
                              cursor: savingDetails ? 'not-allowed' : 'pointer',
                              padding: '0 24px',
                              opacity: savingDetails ? 0.7 : 1
                            }}
                          >
                            {savingDetails ? 'Saving...' : 'Save Changes'}
                          </button>
                          <button
                            type="button"
                            onClick={handleArchive}
                            style={{
                              height: '40px',
                              background: '#B00020',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '8px',
                              fontWeight: '600',
                              fontSize: '13px',
                              cursor: 'pointer',
                              padding: '0 24px',
                              marginLeft: 'auto'
                            }}
                          >
                            Archive Intern
                          </button>
                          {detailsSaved && (
                            <span style={{ fontSize: '13px', color: '#03DAC6', fontWeight: '500' }}>
                              ✓ Changes saved successfully
                            </span>
                          )}
                        </div>

                      </div>
                    )}

                    {/* Tab Contents: Project */}
                    {activeTab === 'project' && (
                      <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '12px', border: '1px solid #E0E0E0', boxShadow: '0 2px 12px rgba(0,0,0,0.01)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                          <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#212121', marginBottom: '16px', marginTop: 0 }}>Project Details</h3>

                          {/* Show Assigned Project */}
                          {projects.length > 0 && !showProjectForm ? (
                            <div style={{ background: '#FAFAFA', padding: '16px', border: '1px solid #EEEEEE', borderRadius: '8px', marginBottom: '10px', position: 'relative' }}>
                              <button
                                type="button"
                                onClick={() => setShowProjectForm(prev => !prev)}
                                style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#3D35C4', fontSize: '16px', padding: '4px' }}
                                title="Edit Project"
                              >
                                <i className="ti ti-pencil" />
                              </button>
                              <h4 style={{ fontSize: '14.5px', fontWeight: '700', color: '#3D35C4', margin: '0 24px 8px 0' }}>{projects[0].title}</h4>
                              <div
                                style={{ fontSize: '13px', color: '#555555', margin: '0 0 14px 0', lineHeight: '1.6' }}
                                className="markdown-preview"
                                dangerouslySetInnerHTML={{ __html: marked.parse(projects[0].description || '') }}
                              />
                              <div style={{ display: 'flex', gap: '10px', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #EEEEEE' }}>
                                {projects[0].git_repo_link && (
                                  <a
                                    href={projects[0].git_repo_link}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      color: '#212121',
                                      background: '#F5F5F5',
                                      border: '1px solid #E0E0E0',
                                      borderRadius: '8px',
                                      padding: '8px 16px',
                                      fontSize: '13px',
                                      fontWeight: '600',
                                      textDecoration: 'none',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#EEEEEE'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = '#F5F5F5'}
                                  >
                                    <i className="ti ti-brand-github" style={{ fontSize: '16px' }} /> Git Repo
                                  </a>
                                )}
                                {projects[0].live_project_link && (
                                  <a
                                    href={projects[0].live_project_link}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      color: '#FFFFFF',
                                      background: '#018786',
                                      border: 'none',
                                      borderRadius: '8px',
                                      padding: '8px 16px',
                                      fontSize: '13px',
                                      fontWeight: '600',
                                      textDecoration: 'none',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#016b6b'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = '#018786'}
                                  >
                                    <i className="ti ti-external-link" style={{ fontSize: '16px' }} /> Live Project
                                  </a>
                                )}
                              </div>
                            </div>
                          ) : projects.length === 0 ? (
                            <p style={{ color: '#9E9E9E', fontSize: '13px', margin: '0 0 10px 0' }}>No project assigned yet. Use the form below to assign one.</p>
                          ) : null}
                        </div>

                        {/* Project Assignment Form */}
                        {(projects.length === 0 || showProjectForm) && (
                          <form onSubmit={handleAssignProject} style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid #EEEEEE', paddingTop: '20px' }}>
                            <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#757575', margin: '0 0 4px 0' }}>
                              {projects.length > 0 ? 'Update Project Specification' : 'Assign New Project'}
                            </h4>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={{ fontSize: '12px', fontWeight: '600', color: '#212121' }}>Project Title</label>
                              <input
                                type="text"
                                placeholder="Project Title"
                                value={projectTitle}
                                onChange={(e) => setProjectTitle(e.target.value)}
                                required
                                style={{ height: '38px', padding: '0 12px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '13.5px', boxSizing: 'border-box' }}
                              />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={{ fontSize: '12px', fontWeight: '600', color: '#212121' }}>Project Description (Markdown supported)</label>
                                <button
                                  type="button"
                                  onClick={() => mdFileInputRef.current && mdFileInputRef.current.click()}
                                  style={{ background: 'none', border: '1px solid #E0E0E0', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', color: '#3D35C4', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                  <i className="ti ti-upload" style={{ fontSize: '14px' }} />
                                  Upload .md File
                                </button>
                                <input
                                  type="file"
                                  ref={mdFileInputRef}
                                  accept=".md,.markdown,text/markdown,text/plain"
                                  style={{ display: 'none' }}
                                  onChange={handleMdFileUpload}
                                />
                              </div>
                              <textarea
                                placeholder="Project Description — supports markdown: # headings, **bold**, - lists, etc."
                                value={projectDesc}
                                onChange={(e) => setProjectDesc(e.target.value)}
                                required
                                rows={6}
                                style={{ padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '13.5px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                              />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={{ fontSize: '12px', fontWeight: '600', color: '#212121' }}>Git Repository URL</label>
                              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <i className="ti ti-brand-github" style={{ position: 'absolute', left: '12px', color: '#757575', fontSize: '16px' }} />
                                <input
                                  type="url"
                                  placeholder="https://github.com/username/repo"
                                  value={projectGit}
                                  onChange={(e) => setProjectGit(e.target.value)}
                                  style={{ width: '100%', height: '38px', padding: '0 12px 0 36px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '13.5px', boxSizing: 'border-box' }}
                                />
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={{ fontSize: '12px', fontWeight: '600', color: '#212121' }}>Live Deploy URL</label>
                              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <i className="ti ti-external-link" style={{ position: 'absolute', left: '12px', color: '#757575', fontSize: '16px' }} />
                                <input
                                  type="url"
                                  placeholder="https://example.com"
                                  value={projectLive}
                                  onChange={(e) => setProjectLive(e.target.value)}
                                  style={{ width: '100%', height: '38px', padding: '0 12px 0 36px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '13.5px', boxSizing: 'border-box' }}
                                />
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                              <button
                                type="submit"
                                style={{ height: '38px', background: '#3D35C4', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', padding: '0 24px' }}
                              >
                                {projects.length > 0 ? 'Update Project Details' : 'Assign Project'}
                              </button>
                              {projects.length > 0 && showProjectForm && (
                                <button
                                  type="button"
                                  onClick={() => setShowProjectForm(false)}
                                  style={{ height: '38px', background: '#FFFFFF', color: '#757575', border: '1px solid #E0E0E0', borderRadius: '6px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', padding: '0 24px' }}
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </form>
                        )}
                      </div>
                    )}

                    {/* Tab Contents: Tasks */}
                    {activeTab === 'tasks' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>

                        {/* AI Generate Button */}
                        <div style={{ padding: '20px', borderBottom: '1px solid #E0E0E0', background: '#FAFAFA' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#212121' }}>
                                🤖 AI Task Generator
                              </h4>
                              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#757575' }}>
                                Generate a full task plan based on the intern's project
                              </p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <button
                                type="button"
                                onClick={openGenerateTasksModal}
                                disabled={aiLoading || !projects.length}
                                style={{
                                  background: aiLoading ? '#F5F5F5' : 'linear-gradient(135deg, #3D35C4, #03DAC6)',
                                  color: aiLoading ? '#BDBDBD' : '#fff',
                                  border: 'none', borderRadius: '8px', padding: '10px 20px',
                                  fontSize: '13px', fontWeight: 700,
                                  cursor: aiLoading || !projects.length ? 'not-allowed' : 'pointer',
                                  display: 'flex', alignItems: 'center', gap: '8px',
                                  opacity: !projects.length ? 0.5 : 1
                                }}
                              >
                                {aiLoading ? '⏳ Generating...' : '✨ Generate AI Tasks'}
                              </button>
                              {aiDraftsExist && (
                                <button
                                  type="button"
                                  onClick={() => setShowAiModal(true)}
                                  style={{
                                    marginLeft: '10px', background: '#FFF3E0', color: '#E65100',
                                    border: '1px solid #FFCC80', borderRadius: '8px', padding: '10px 16px',
                                    fontSize: '13px', fontWeight: 700, cursor: 'pointer'
                                  }}
                                >
                                  📋 View Pending AI Tasks
                                </button>
                              )}
                            </div>
                          </div>
                          {!projects.length && (
                            <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#B00020' }}>
                              Assign a project first before generating AI tasks
                            </p>
                          )}
                        </div>

                        {/* Status Tabs */}
                        {(() => {
                          const STATUS_TABS = [
                            { key: 'not_started', label: 'Not Started' },
                            { key: 'in_progress', label: 'In Progress' },
                            { key: 'completed', label: 'Completed' }
                          ]
                          const tabCounts = {
                            not_started: tasks.filter(t => (t.status || 'not_started') === 'not_started').length,
                            in_progress: tasks.filter(t => t.status === 'in_progress').length,
                            completed: tasks.filter(t => t.status === 'completed').length
                          }
                          const filteredTasks = tasks.filter(t => (t.status || 'not_started') === taskStatusTab)

                          return (
                            <>
                              <div style={{
                                display: 'flex', borderBottom: '2px solid #E0E0E0',
                                background: '#fff', paddingLeft: '4px'
                              }}>
                                {STATUS_TABS.map(tab => {
                                  const isActive = taskStatusTab === tab.key
                                  const color = tab.key === 'completed' ? '#2E7D32' : tab.key === 'in_progress' ? '#1565C0' : '#E65100'
                                  return (
                                    <button
                                      key={tab.key}
                                      type="button"
                                      onClick={() => { setTaskStatusTab(tab.key); setExpandedTaskId(null) }}
                                      style={{
                                        padding: '10px 18px', fontSize: '12px', fontWeight: isActive ? '700' : '500',
                                        color: isActive ? color : '#9E9E9E',
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        borderBottom: isActive ? `2px solid ${color}` : '2px solid transparent',
                                        marginBottom: '-2px', display: 'flex', alignItems: 'center', gap: '6px'
                                      }}
                                    >
                                      {tab.label}
                                      <span style={{
                                        background: isActive ? color : '#E0E0E0',
                                        color: isActive ? '#fff' : '#9E9E9E',
                                        borderRadius: '10px', fontSize: '10px', fontWeight: '700',
                                        padding: '1px 6px', minWidth: '16px', textAlign: 'center'
                                      }}>
                                        {tabCounts[tab.key]}
                                      </span>
                                    </button>
                                  )
                                })}
                              </div>

                              {/* Task List */}
                              {filteredTasks.length === 0 ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: '#9E9E9E', fontSize: '13px', fontStyle: 'italic' }}>
                                  No {STATUS_TABS.find(t => t.key === taskStatusTab)?.label.toLowerCase()} tasks.
                                </div>
                              ) : (
                                filteredTasks.map((task, index) => {
                                  const isExpanded = expandedTaskId === task.id
                                  const isNotesExpanded = expandedNotesTaskId === task.id
                                  const statusColor = task.status === 'completed' ? '#2E7D32' : task.status === 'in_progress' ? '#1565C0' : '#F9A825'
                                  const statusBg = task.status === 'completed' ? '#E8F5E9' : task.status === 'in_progress' ? '#E3F2FD' : '#FFF8E1'
                                  const subForm = subTaskForms[task.id] || { title: '', description: '', expected_date: '' }
                                  const notes = taskNotes[task.id] || []

                                  return (
                                    <div key={task.id} style={{
                                      borderBottom: '1px solid #F0F0F0',
                                      background: isExpanded ? '#FAFAFA' : '#fff'
                                    }}>

                                      {/* Task Header Row */}
                                      <div
                                        onClick={async () => {
                                          const opening = expandedTaskId !== task.id
                                          setExpandedTaskId(opening ? task.id : null)
                                          if (opening && !taskSubTasks[task.id]) {
                                            try {
                                              const subs = await getSubTasksByTaskId(task.id)
                                              setTaskSubTasks(prev => ({ ...prev, [task.id]: subs || [] }))
                                            } catch (err) { }
                                          }
                                        }}
                                        style={{
                                          display: 'flex', alignItems: 'center', gap: '12px',
                                          padding: '14px 20px', cursor: 'pointer',
                                          userSelect: 'none'
                                        }}
                                      >
                                        {/* Index */}
                                        <span style={{
                                          width: '24px', height: '24px', borderRadius: '50%',
                                          background: '#F0EEFF', color: '#3D35C4',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          fontSize: '11px', fontWeight: 700, flexShrink: 0
                                        }}>
                                          {index + 1}
                                        </span>

                                        {/* Title */}
                                        <span style={{ flex: 1, fontSize: '14px', fontWeight: 600, color: '#212121' }}>
                                          {task.title}
                                          {task.is_ai_generated && (
                                            <span style={{
                                              marginLeft: '8px', fontSize: '10px', background: '#F0EEFF',
                                              color: '#3D35C4', padding: '2px 6px', borderRadius: '4px', fontWeight: 600
                                            }}>
                                              AI
                                            </span>
                                          )}
                                        </span>

                                        {/* Expected Date */}
                                        <span style={{ fontSize: '12px', color: '#9E9E9E', flexShrink: 0 }}>
                                          {formatDate(task.expected_date)}
                                        </span>

                                        {/* Status Badge */}
                                        <span style={{
                                          fontSize: '11px', fontWeight: 700, padding: '3px 10px',
                                          borderRadius: '4px', background: statusBg, color: statusColor,
                                          textTransform: 'uppercase', flexShrink: 0
                                        }}>
                                          {task.status.replace('_', ' ')}
                                        </span>

                                        {/* Expand Arrow */}
                                        <span style={{
                                          fontSize: '18px', color: '#9E9E9E', flexShrink: 0,
                                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                          transition: 'transform 0.2s'
                                        }}>
                                          ▾
                                        </span>
                                      </div>

                                      {/* Expanded Content */}
                                      {isExpanded && (
                                        <div style={{ padding: '0 20px 20px 56px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                                          {/* Description */}
                                          {task.description && (
                                            <div>
                                              <p style={{ margin: '0 0 6px 0', fontSize: '11px', fontWeight: 700, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</p>
                                              <p style={{ margin: 0, fontSize: '13px', color: '#555', lineHeight: 1.7 }}>{task.description}</p>
                                            </div>
                                          )}

                                          {/* Deliverables */}
                                          {task.deliverables && task.deliverables.length > 0 && (
                                            <div>
                                              <p style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: 700, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Deliverables</p>
                                              <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {task.deliverables.map((d, i) => (
                                                  <li key={i} style={{ fontSize: '13px', color: '#444', lineHeight: 1.5 }}>{d}</li>
                                                ))}
                                              </ul>
                                            </div>
                                          )}



                                          {/* Sub Task Form — Admin only */}
                                          <div style={{ background: '#F8F7FF', borderRadius: '8px', padding: '14px' }}>
                                            <p style={{ margin: '0 0 10px 0', fontSize: '11px', fontWeight: 700, color: '#3D35C4', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Add Sub Task</p>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                              <input
                                                type="text"
                                                placeholder="Sub task title"
                                                value={subForm.title}
                                                onChange={e => setSubTaskForms(prev => ({ ...prev, [task.id]: { ...subForm, title: e.target.value } }))}
                                                style={{ height: '36px', padding: '0 10px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '13px' }}
                                              />
                                              <textarea
                                                placeholder="Sub task description (optional)"
                                                value={subForm.description}
                                                onChange={e => setSubTaskForms(prev => ({ ...prev, [task.id]: { ...subForm, description: e.target.value } }))}
                                                rows={2}
                                                style={{ padding: '8px 10px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '13px', resize: 'none', fontFamily: 'inherit' }}
                                              />
                                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <input
                                                  type="date"
                                                  value={subForm.expected_date}
                                                  onChange={e => setSubTaskForms(prev => ({ ...prev, [task.id]: { ...subForm, expected_date: e.target.value } }))}
                                                  style={{ height: '36px', padding: '0 10px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '13px' }}
                                                />
                                                <button
                                                  type="button"
                                                  onClick={async () => {
                                                    if (!subForm.title.trim()) return
                                                    try {
                                                      const newSub = await createSubTask(task.id, {
                                                        intern_id: selectedIntern.id,
                                                        title: subForm.title.trim(),
                                                        description: subForm.description.trim(),
                                                        expected_date: subForm.expected_date || null
                                                      })
                                                      setTaskSubTasks(prev => ({ ...prev, [task.id]: [...(prev[task.id] || []), newSub] }))
                                                      setSubTaskForms(prev => ({ ...prev, [task.id]: { title: '', description: '', expected_date: '' } }))
                                                    } catch (err) {
                                                      alert('Failed to add sub task: ' + err.message)
                                                    }
                                                  }}
                                                  style={{
                                                    height: '36px', padding: '0 16px', background: '#3D35C4',
                                                    color: '#fff', border: 'none', borderRadius: '6px',
                                                    fontSize: '12px', fontWeight: 600, cursor: 'pointer'
                                                  }}
                                                >
                                                  Add Sub Task
                                                </button>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Existing Sub Tasks List */}
                                          {taskSubTasks[task.id] && taskSubTasks[task.id].length > 0 && (
                                            <div>
                                              <p style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: 700, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                Sub Tasks ({taskSubTasks[task.id].length})
                                              </p>
                                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {taskSubTasks[task.id].map((sub, i) => {
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
                                                            onClick={async (e) => {
                                                              e.stopPropagation()
                                                              try {
                                                                await updateSubTaskStatus(sub.id, s)
                                                                setTaskSubTasks(prev => ({
                                                                  ...prev,
                                                                  [task.id]: prev[task.id].map(st => st.id === sub.id ? { ...st, status: s } : st)
                                                                }))
                                                              } catch (err) {
                                                                alert('Failed to update sub task: ' + err.message)
                                                              }
                                                            }}
                                                            style={{
                                                              height: '22px', padding: '0 7px', borderRadius: '4px',
                                                              fontSize: '9px', fontWeight: 600, cursor: 'pointer', border: '1px solid',
                                                              background: sub.status === s ? subColor : '#fff',
                                                              color: sub.status === s ? '#fff' : '#9E9E9E',
                                                              borderColor: sub.status === s ? 'transparent' : '#E0E0E0'
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

                                          {/* Notes Accordion */}
                                          <div style={{ border: '1px solid #E0E0E0', borderRadius: '8px', overflow: 'hidden' }}>
                                            <div
                                              onClick={async (e) => {
                                                e.stopPropagation()
                                                const opening = expandedNotesTaskId !== task.id
                                                setExpandedNotesTaskId(opening ? task.id : null)
                                                if (opening && !taskNotes[task.id]) {
                                                  try {
                                                    const notes = await getTaskNotes(task.id)
                                                    setTaskNotes(prev => ({ ...prev, [task.id]: notes }))
                                                  } catch (err) { }
                                                }
                                              }}
                                              style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                padding: '10px 14px', cursor: 'pointer', background: '#FAFAFA',
                                                userSelect: 'none'
                                              }}
                                            >
                                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                📝 Intern Notes
                                              </span>
                                              <span style={{
                                                fontSize: '16px', color: '#9E9E9E',
                                                transform: isNotesExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                                transition: 'transform 0.2s'
                                              }}>▾</span>
                                            </div>
                                            {isNotesExpanded && (
                                              <div style={{ padding: '14px' }}>
                                                {notes.length === 0 ? (
                                                  <p style={{ margin: 0, fontSize: '13px', color: '#9E9E9E', textAlign: 'center' }}>No notes yet.</p>
                                                ) : (
                                                  notes.map((n, i) => (
                                                    <div key={i} style={{ marginBottom: '10px', padding: '10px', background: '#FFFDE7', borderRadius: '6px', border: '1px solid #FFF9C4' }}>
                                                      <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: 600, color: '#3D35C4' }}>{n.intern_name}</p>
                                                      <p style={{ margin: 0, fontSize: '13px', color: '#444', lineHeight: 1.6 }}>{n.note}</p>
                                                    </div>
                                                  ))
                                                )}
                                              </div>
                                            )}
                                          </div>

                                        </div>
                                      )}
                                    </div>
                                  )
                                })
                              )}
                            </>
                          )
                        })()}

                        {/* Manual Assign Task Form */}
                        <div style={{ padding: '20px', borderTop: '1px solid #E0E0E0', background: '#FAFAFA' }}>
                          <h4 style={{ fontSize: '12px', fontWeight: '600', color: '#757575', textTransform: 'uppercase', marginBottom: '12px', marginTop: 0 }}>Assign New Task Manually</h4>
                          <form onSubmit={handleAssignTask} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                            <div style={{ flex: 2, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={{ fontSize: '11px', fontWeight: '600', color: '#757575' }}>Task Title</label>
                              <input
                                type="text"
                                placeholder="Describe the task to assign"
                                value={assignWork}
                                onChange={e => setAssignWork(e.target.value)}
                                required
                                style={{ height: '40px', padding: '0 12px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                              />
                            </div>
                            <div style={{ flex: 1, minWidth: '150px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={{ fontSize: '11px', fontWeight: '600', color: '#757575' }}>Expected Date</label>
                              <input
                                type="date"
                                value={expectedDate}
                                onChange={e => setExpectedDate(e.target.value)}
                                required
                                style={{ height: '40px', padding: '0 12px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                              />
                            </div>
                            <button
                              type="submit"
                              style={{ height: '40px', background: '#3D35C4', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', padding: '0 24px' }}
                            >
                              Assign Task
                            </button>
                          </form>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Empty Right Sidebar State when no intern is selected */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', background: '#FAFAFA', border: '1.5px dashed #E0E0E0', borderRadius: '12px', padding: '40px', textAlign: 'center', boxSizing: 'border-box' }}>
                  <i className="ti ti-user-edit" style={{ fontSize: '40px', color: '#BDBDBD', marginBottom: '14px' }} aria-hidden="true" />
                  <p style={{ fontWeight: '600', color: '#757575', fontSize: '14px', margin: '0 0 6px 0' }}>Select an Intern</p>
                  <p style={{ color: '#BDBDBD', fontSize: '12.5px', margin: 0 }}>Click an intern on the left sidebar to manage their profile details, projects, and task records.</p>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

      {/* Date Range Modal for AI Task Generation */}
      {showDateRangeModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
        }}>
          <div style={{
            background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '420px',
            padding: '28px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '700', color: '#212121' }}>
              📅 Set Task Plan Duration
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#757575' }}>
              AI will generate one task per working day (weekends excluded) across this date range.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#212121' }}>Start Date</label>
                <input
                  type="date"
                  value={genStartDate}
                  onChange={(e) => setGenStartDate(e.target.value)}
                  style={{ height: '40px', padding: '0 12px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '13.5px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#212121' }}>End Date</label>
                <input
                  type="date"
                  value={genEndDate}
                  onChange={(e) => setGenEndDate(e.target.value)}
                  style={{ height: '40px', padding: '0 12px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '13.5px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowDateRangeModal(false)}
                style={{ height: '38px', padding: '0 20px', background: '#F5F5F5', color: '#212121', border: '1px solid #E0E0E0', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmGenerateAITasks}
                style={{ height: '38px', padding: '0 20px', background: 'linear-gradient(135deg, #3D35C4, #03DAC6)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
              >
                ✨ Generate Tasks
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Task Review Modal */}
      {showAiModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
        }}>
          <div style={{
            background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '680px',
            maxHeight: '80vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E0E0E0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#212121' }}>✨ AI Generated Tasks</h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#757575' }}>{aiTasks.length} tasks generated — confirm each to assign</p>
              </div>
              <button type="button" onClick={() => setShowAiModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#757575', lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {aiTasks.map((draft, index) => {
                const isEditing = editingDraftId === draft.id
                return (
                  <div key={draft.id || index} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '12px',
                    padding: '12px 14px', border: `1px solid ${draft.is_assigned ? '#A5D6A7' : isEditing ? '#3D35C4' : '#E0E0E0'}`,
                    borderRadius: '8px', background: draft.is_assigned ? '#F1F8E9' : '#FAFAFA'
                  }}>
                    <div style={{ flex: 1 }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <input
                            type="text"
                            value={editDraftForm.title}
                            onChange={(e) => setEditDraftForm(prev => ({ ...prev, title: e.target.value }))}
                            style={{ height: '32px', padding: '0 10px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '13px', fontWeight: '600' }}
                          />
                          <textarea
                            value={editDraftForm.description}
                            onChange={(e) => setEditDraftForm(prev => ({ ...prev, description: e.target.value }))}
                            rows={2}
                            style={{ padding: '8px 10px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '12px', resize: 'none', fontFamily: 'inherit' }}
                          />
                          <input
                            type="date"
                            value={editDraftForm.expected_date}
                            onChange={(e) => setEditDraftForm(prev => ({ ...prev, expected_date: e.target.value }))}
                            style={{ height: '32px', padding: '0 10px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '12px', width: 'fit-content' }}
                          />
                        </div>
                      ) : (
                        <>
                          <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: '600', color: '#212121' }}>{draft.title}</p>
                          <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#757575', lineHeight: 1.5 }}>{draft.description}</p>
                          <span style={{ fontSize: '11px', color: '#9E9E9E' }}>📅 {formatDate(draft.expected_date)}</span>
                        </>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                      {draft.is_assigned ? (
                        <span style={{
                          background: '#E8F5E9', color: '#2E7D32', border: 'none', borderRadius: '6px',
                          padding: '8px 16px', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap'
                        }}>
                          ✓ Assigned
                        </span>
                      ) : isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const updated = await updateAITaskDraft(draft.id, editDraftForm)
                                setAiTasks(prev => prev.map(t => t.id === draft.id ? { ...t, ...updated } : t))
                                setEditingDraftId(null)
                              } catch (err) {
                                alert('Failed to save edit: ' + err.message)
                              }
                            }}
                            style={{ background: '#3D35C4', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingDraftId(null)}
                            style={{ background: '#F5F5F5', color: '#757575', border: '1px solid #E0E0E0', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDraftId(draft.id)
                              setEditDraftForm({
                                title: draft.title,
                                description: draft.description || '',
                                expected_date: formatDateForInput(draft.expected_date)
                              })
                            }}
                            style={{ background: '#FFFFFF', color: '#3D35C4', border: '1px solid #3D35C4', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await assignAITaskDraft(selectedIntern.id, draft.id)
                                setAiTasks(prev => prev.map(t => t.id === draft.id ? { ...t, is_assigned: true } : t))
                                const refreshed = await getTasksByInternId(selectedIntern.id)
                                if (refreshed) { refreshed.reverse(); setTasks(refreshed) }
                              } catch (err) {
                                alert('Failed to assign: ' + err.message)
                              }
                            }}
                            style={{ background: '#3D35C4', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                          >
                            + Assign
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #E0E0E0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const unassigned = aiTasks.filter(t => !t.is_assigned)
                    for (const draft of unassigned) {
                      await assignAITaskDraft(selectedIntern.id, draft.id)
                    }
                    setAiTasks(prev => prev.map(t => ({ ...t, is_assigned: true })))
                    const refreshed = await getTasksByInternId(selectedIntern.id)
                    if (refreshed) { refreshed.reverse(); setTasks(refreshed) }
                    setAiDraftsExist(false)
                  } catch (err) {
                    alert('Failed to assign remaining tasks: ' + err.message)
                  }
                }}
                style={{
                  height: '36px', padding: '0 20px', background: '#3D35C4',
                  color: '#fff', border: 'none', borderRadius: '8px',
                  fontSize: '13px', fontWeight: '600', cursor: 'pointer'
                }}
              >Assign All Remaining</button>
              <button type="button" onClick={() => setShowAiModal(false)}
                style={{
                  height: '36px', padding: '0 20px', background: '#F5F5F5',
                  color: '#212121', border: '1px solid #E0E0E0', borderRadius: '8px',
                  fontSize: '13px', fontWeight: '600', cursor: 'pointer'
                }}
              >Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '480px', padding: '28px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '700', color: '#212121' }}>
              {isEditingFeedback ? '✏️ Edit Feedback' : '🎓 Mark Internship Complete'}
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#757575' }}>Provide a rating and feedback for {selectedIntern?.name}</p>

            <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: '700', color: '#9E9E9E', textTransform: 'uppercase' }}>Rating</p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFeedbackForm(prev => ({ ...prev, rating: star }))}
                  style={{ fontSize: '28px', background: 'none', border: 'none', cursor: 'pointer', color: star <= feedbackForm.rating ? '#F9A825' : '#E0E0E0', padding: 0 }}
                >★</button>
              ))}
            </div>

            <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: '700', color: '#9E9E9E', textTransform: 'uppercase' }}>Feedback</p>
            <textarea
              placeholder="Write your feedback about this intern's performance..."
              value={feedbackForm.feedback}
              onChange={e => setFeedbackForm(prev => ({ ...prev, feedback: e.target.value }))}
              rows={4}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: '8px', fontSize: '13px', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '20px' }}
            />

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowFeedbackModal(false)}
                style={{ height: '38px', padding: '0 20px', background: '#F5F5F5', color: '#212121', border: '1px solid #E0E0E0', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="button" onClick={handleCompleteInternship} disabled={actionLoading}
                style={{ height: '38px', padding: '0 20px', background: '#2E7D32', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', opacity: actionLoading ? 0.7 : 1 }}>
                {actionLoading ? 'Saving...' : isEditingFeedback ? 'Update Feedback' : 'Submit Feedback'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discontinue Modal */}
      {showDiscontinueModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '440px', padding: '28px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '700', color: '#B00020' }}>⛔ Discontinue Intern</h3>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#757575' }}>This will immediately block {selectedIntern?.name} from logging in.</p>

            <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: '700', color: '#9E9E9E', textTransform: 'uppercase' }}>Reason for Discontinuation</p>
            <textarea
              placeholder="Enter the reason for discontinuing this internship..."
              value={discontinueReason}
              onChange={e => setDiscontinueReason(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #FFCDD2', borderRadius: '8px', fontSize: '13px', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '20px' }}
            />

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowDiscontinueModal(false)}
                style={{ height: '38px', padding: '0 20px', background: '#F5F5F5', color: '#212121', border: '1px solid #E0E0E0', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="button" onClick={handleDiscontinueIntern} disabled={actionLoading}
                style={{ height: '38px', padding: '0 20px', background: '#B00020', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', opacity: actionLoading ? 0.7 : 1 }}>
                {actionLoading ? 'Processing...' : 'Confirm Discontinue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Discontinue Modal */}
      {showRevokeModal && (
        <div onClick={() => setShowRevokeModal(false)} style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: '16px', padding: '28px',
            width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#212121', fontWeight: 700 }}>Revoke Discontinue</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#757575' }}>
              This will restore {selectedIntern?.name}'s access and allow them to log in again.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowRevokeModal(false)} style={{
                padding: '8px 16px', background: '#F5F5F5', color: '#757575',
                border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer'
              }}>Cancel</button>
              <button
                onClick={async () => {
                  try {
                    await revokeDiscontinue(selectedIntern.id)
                    setSelectedIntern(prev => ({ ...prev, intern_status: 'active', login_blocked: false, discontinued_reason: null }))
                    setInterns(prev => prev.map(i => i.id === selectedIntern.id ? { ...i, intern_status: 'active', login_blocked: false } : i))
                    setShowRevokeModal(false)
                  } catch (err) {
                    alert('Failed to revoke: ' + err.message)
                  }
                }}
                style={{
                  padding: '8px 16px', background: '#3D35C4', color: '#fff',
                  border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer'
                }}
              >Confirm Revoke</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ApprovedInterns;
