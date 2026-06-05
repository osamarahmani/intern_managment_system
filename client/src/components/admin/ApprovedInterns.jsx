import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabase/client';
import { formatDate } from '../../utils/formatDate';
import * as XLSX from 'xlsx';

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

const ApprovedInterns = () => {
  // Navigation & View States
  const [activeView, setActiveView] = useState('batches'); // 'batches' | 'batchDetails'
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedIntern, setSelectedIntern] = useState(null);

  // Split Panel Resizing States & Refs
  const [leftWidth, setLeftWidth] = useState(340);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);
  const dragRef = useRef(null);

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
      const { data: batchInterns, error: internErr } = await supabase
        .from('interns')
        .select('id, name, photo_url, starting_date, ending_date')
        .eq('batch_number', batchNum)
        .eq('status', 'approved');
      
      if (internErr) throw internErr;

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
      const { data: batchTasks, error: taskErr } = await supabase
        .from('tasks')
        .select('id, intern_id, status, expected_date, submission_date')
        .in('intern_id', internIds);

      if (taskErr) throw taskErr;

      // 3. Fetch projects for those interns
      const { data: batchProjects, error: projErr } = await supabase
        .from('projects')
        .select('id, intern_id')
        .in('intern_id', internIds);

      if (projErr) throw projErr;

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
      let internsQuery = supabase
        .from('interns')
        .select('*')
        .eq('status', 'approved');

      if (batchNumber) {
        internsQuery = internsQuery.eq('batch_number', batchNumber);
      }

      const { data: interns, error: internsErr } = await internsQuery;
      if (internsErr) throw internsErr;

      if (!interns || interns.length === 0) {
        alert('No interns found to export.');
        setExportLoading(false);
        return;
      }

      const internIds = interns.map(i => i.id);

      // 2. Fetch projects
      const { data: projects, error: projectsErr } = await supabase
        .from('projects')
        .select('*')
        .in('intern_id', internIds);
      if (projectsErr) throw projectsErr;

      // 3. Fetch tasks
      const { data: tasks, error: tasksErr } = await supabase
        .from('tasks')
        .select('*')
        .in('intern_id', internIds);
      if (tasksErr) throw tasksErr;

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
      setActiveTab('details');
    }
  }, [selectedIntern]);

  // 4. Populate editedIntern when selectedIntern changes
  useEffect(() => {
    if (selectedIntern) {
      setEditedIntern({ ...selectedIntern });
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
      const { error } = await supabase
        .from('interns')
        .update({
          name: editedIntern.name,
          college_name: editedIntern.college_name,
          dept: editedIntern.dept,
          year: editedIntern.year,
          sem: editedIntern.sem,
          mail: editedIntern.mail,
          number: editedIntern.number,
          starting_date: editedIntern.starting_date,
          ending_date: editedIntern.ending_date,
          batch_number: editedIntern.batch_number
        })
        .eq('id', selectedIntern.id);
      if (error) throw error;

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

  // ==========================================================================
  // Fetch Functions
  // ==========================================================================

  const fetchBatches = async () => {
    try {
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setBatches(data);
    } catch (err) {
      console.error('Error fetching batches:', err.message);
    }
  };

  const fetchInternsForBatch = async (batchNum) => {
    try {
      const { data, error } = await supabase
        .from('interns')
        .select('*')
        .eq('batch_number', batchNum)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setInterns(data);
    } catch (err) {
      console.error('Error fetching interns:', err.message);
    }
  };

  const fetchInternDetails = async (internId) => {
    try {
      // Fetch projects
      const { data: projData, error: projError } = await supabase
        .from('projects')
        .select('*')
        .eq('intern_id', internId);
      if (projError) throw projError;
      setProjects(projData || []);

      // Prefill project form states reactively
      if (projData && projData.length > 0) {
        setProjectTitle(projData[0].title || '');
        setProjectDesc(projData[0].description || '');
        setProjectGit(projData[0].git_repo_link || '');
        setProjectLive(projData[0].live_project_link || '');
      } else {
        resetProjectForm();
      }

      // Fetch tasks
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('intern_id', internId)
        .order('created_at', { ascending: true });
      if (taskError) throw taskError;
      setTasks(taskData || []);
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
      const { data, error } = await supabase
        .from('batches')
        .insert({
          batch_number: batchNumber.trim(),
          registration_key: registrationKey.trim(),
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

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
      const { error } = await supabase
        .from('batches')
        .update({ is_active: updatedStatus })
        .eq('id', batch.id);

      if (error) throw error;

      setBatches((prev) =>
        prev.map((b) => (b.id === batch.id ? { ...b, is_active: updatedStatus } : b))
      );
    } catch (err) {
      alert(`Status toggle failed: ${err.message}`);
    }
  };

  const handleUpdateVisibilityMode = async (batchId, mode) => {
    try {
      const { error } = await supabase
        .from('batches')
        .update({ visibility_mode: mode })
        .eq('id', batchId);

      if (error) throw error;

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

  const handleAssignProject = async (e) => {
    e.preventDefault();
    if (!selectedIntern) return;

    if (!projectTitle.trim() || !projectDesc.trim()) {
      alert('Project Title and Description are required.');
      return;
    }

    try {
      // Upsert project so that it overwrites if one exists for the intern, or creates a new one
      const { data, error } = await supabase
        .from('projects')
        .upsert({
          intern_id: selectedIntern.id,
          title: projectTitle.trim(),
          description: projectDesc.trim(),
          git_repo_link: projectGit.trim(),
          live_project_link: projectLive.trim()
        })
        .select()
        .single();

      if (error) throw error;

      alert('Project assigned/updated successfully!');
      // Update local state reactively
      setProjects([data]);
      resetProjectForm();
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
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          intern_id: selectedIntern.id,
          title: assignWork.trim(),
          expected_date: expectedDate,
          submission_date: null,
          status: 'not_started'
        })
        .select()
        .single();

      if (error) throw error;

      alert('Task assigned successfully!');
      setTasks((prev) => [...prev, data]);
      resetTaskForm();
    } catch (err) {
      alert(`Task assignment failed: ${err.message}`);
    }
  };

  const handleDeleteTask = async (taskId) => {
    console.log('Delete task called with id:', taskId);
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    console.log('Confirmed delete for:', taskId);
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      alert('Task deleted successfully!');
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      alert(`Failed to delete task: ${err.message}`);
    }
  };



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
        <div>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '30px', alignItems: 'start' }}>

            {/* Left Column: Provision New Batch & Batch Summary Card */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                        {summaryStats.topPerformer.photo_url ? (
                          <img
                            src={summaryStats.topPerformer.photo_url}
                            alt={summaryStats.topPerformer.name}
                            style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              flexShrink: 0
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            background: '#3D35C4',
                            color: '#fff',
                            fontSize: '16px',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {summaryStats.topPerformer.name
                              ? summaryStats.topPerformer.name.split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase()
                              : 'IN'}
                          </div>
                        )}
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
            <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '12px', border: '1px solid #E0E0E0', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#212121', marginBottom: '16px', marginTop: 0 }}>Registered Batches ({batches.length})</h3>

              {batches.length === 0 ? (
                <p style={{ color: '#9E9E9E', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>No batches provisioned yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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

                        {/* Bottom row — Show Key button */}
                        <div>
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
                        {/* Avatar */}
                        {intern.photo_url || intern.photo ? (
                          <img
                            src={intern.photo_url || intern.photo}
                            alt={intern.name}
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              flexShrink: 0
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              background: '#3D35C4',
                              color: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: '600',
                              fontSize: '14px',
                              flexShrink: 0
                            }}
                          >
                            {initials}
                          </div>
                        )}

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
                      {['details', 'project', 'tasks'].map(tab => (
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
                            textTransform: 'capitalize'
                          }}
                        >
                          {tab}
                        </button>
                      ))}
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
                          gap: '20px',
                          paddingBottom: '20px',
                          borderBottom: '1px solid #F0F0F0',
                          marginBottom: '20px'
                        }}>
                          {/* Circular avatar */}
                          {selectedIntern.photo_url ? (
                            <img
                              src={selectedIntern.photo_url}
                              alt={selectedIntern.name}
                              style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '3px solid #EEEEEE',
                                flexShrink: 0
                              }}
                            />
                          ) : (
                            <div style={{
                              width: '80px',
                              height: '80px',
                              borderRadius: '50%',
                              background: '#3D35C4',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '28px',
                              fontWeight: '600',
                              color: '#FFFFFF',
                              flexShrink: 0,
                              border: '3px solid #EEEEEE'
                            }}>
                              {selectedIntern.name?.charAt(0).toUpperCase()}
                            </div>
                          )}

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
                            <span style={{
                              fontSize: '11px',
                              background: '#E6F4EA',
                              color: '#137333',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontWeight: '700',
                              textTransform: 'uppercase',
                              alignSelf: 'flex-start',
                              marginTop: '2px'
                            }}>
                              {selectedIntern.status}
                            </span>
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
                          {projects.length > 0 ? (
                            <div style={{ background: '#FAFAFA', padding: '16px', border: '1px solid #EEEEEE', borderRadius: '8px', marginBottom: '10px' }}>
                              <h4 style={{ fontSize: '14.5px', fontWeight: '700', color: '#3D35C4', margin: '0 0 8px 0' }}>{projects[0].title}</h4>
                              <p style={{ fontSize: '13px', color: '#555555', margin: '0 0 14px 0', lineHeight: '1.5' }}>{projects[0].description}</p>
                              <div style={{ display: 'flex', gap: '16px', fontSize: '12.5px' }}>
                                {projects[0].git_repo_link && (
                                  <a href={projects[0].git_repo_link} target="_blank" rel="noreferrer" style={{ color: '#3D35C4', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <i className="ti ti-brand-github" /> Git Repo
                                  </a>
                                )}
                                {projects[0].live_project_link && (
                                  <a href={projects[0].live_project_link} target="_blank" rel="noreferrer" style={{ color: '#018786', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <i className="ti ti-external-link" /> Live Project
                                  </a>
                                )}
                              </div>
                            </div>
                          ) : (
                            <p style={{ color: '#9E9E9E', fontSize: '13px', margin: '0 0 10px 0' }}>No project assigned yet. Use the form below to assign one.</p>
                          )}
                        </div>

                        {/* Project Assignment Form */}
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
                            <label style={{ fontSize: '12px', fontWeight: '600', color: '#212121' }}>Project Description</label>
                            <textarea
                              placeholder="Project Description"
                              value={projectDesc}
                              onChange={(e) => setProjectDesc(e.target.value)}
                              required
                              rows={3}
                              style={{ padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '13.5px', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
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

                          <button
                            type="submit"
                            style={{ height: '38px', background: '#3D35C4', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', alignSelf: 'flex-start', padding: '0 24px', marginTop: '4px' }}
                          >
                            {projects.length > 0 ? 'Update Project Details' : 'Assign Project'}
                          </button>
                        </form>
                      </div>
                    )}

                    {/* Tab Contents: Tasks */}
                    {activeTab === 'tasks' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', border: '1px solid #E0E0E0', borderRadius: '8px', overflow: 'hidden' }}>

                        {/* Section 1: Current Assigned Work */}
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
                                </tr>
                              </thead>
                              <tbody>
                                {(() => {
                                  const currentTask = tasks.find(t => t.status !== 'completed');
                                  return currentTask ? (
                                    <tr style={{ background: '#EEF4FF' }}>
                                      <td style={tdStyle}>{currentTask.title}</td>
                                      <td style={tdStyle}>{formatDate(currentTask.expected_date)}</td>
                                      <td style={tdStyle}>
                                        <span style={inProgressBadge}>In Progress</span>
                                      </td>
                                    </tr>
                                  ) : (
                                    <tr>
                                      <td colSpan={3} style={{ ...tdStyle, color: '#9E9E9E', textAlign: 'center' }}>
                                        No active task in progress.
                                      </td>
                                    </tr>
                                  );
                                })()}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Section 2: Finished Works */}
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
                                {(() => {
                                  const finishedList = tasks.filter(t => t.status === 'completed');
                                  return finishedList.length > 0 ? (
                                    finishedList.map((task, index) => (
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
                                        No finished tasks.
                                      </td>
                                    </tr>
                                  );
                                })()}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Section 3: Upcoming Tasks */}
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
                                  <th style={thStyle}>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(() => {
                                  const activeTask = tasks.find(t => t.status !== 'completed');
                                  const upcomingList = tasks.filter(t => t.status !== 'completed' && t.id !== activeTask?.id);
                                  return upcomingList.length > 0 ? (
                                    upcomingList.map((task, index) => (
                                      <tr key={task.id} style={{ background: index % 2 === 0 ? '#FFFFFF' : '#FFFBF5' }}>
                                        <td style={tdStyle}>{task.title}</td>
                                        <td style={tdStyle}>{formatDate(task.expected_date)}</td>
                                        <td style={tdStyle}>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteTask(task.id);
                                            }}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                                            title="Delete Task"
                                          >
                                            <i className="ti ti-trash" style={{ color: '#B00020', fontSize: '18px' }} />
                                          </button>
                                        </td>
                                      </tr>
                                    ))
                                  ) : (
                                    <tr>
                                      <td colSpan={3} style={{ ...tdStyle, color: '#9E9E9E', textAlign: 'center' }}>
                                        No upcoming tasks queued.
                                      </td>
                                    </tr>
                                  );
                                })()}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Section 4: Assign New Task */}
                        <div style={{ padding: '20px', borderTop: '1px solid #E0E0E0', background: '#FAFAFA' }}>
                          <h4 style={{ fontSize: '12px', fontWeight: '600', color: '#757575', textTransform: 'uppercase', marginBottom: '12px', marginTop: 0 }}>Assign New Task</h4>
                          <form onSubmit={handleAssignTask} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                            <div style={{ flex: 2, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={{ fontSize: '11px', fontWeight: '600', color: '#757575' }}>Assign Work</label>
                              <input
                                type="text"
                                placeholder="Describe the task to assign"
                                value={assignWork}
                                onChange={(e) => setAssignWork(e.target.value)}
                                required
                                style={{ height: '40px', padding: '0 12px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '13.5px', boxSizing: 'border-box' }}
                              />
                            </div>
                            <div style={{ flex: 1, minWidth: '150px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={{ fontSize: '11px', fontWeight: '600', color: '#757575' }}>Expected Finish Date</label>
                              <input
                                type="date"
                                value={expectedDate}
                                onChange={(e) => setExpectedDate(e.target.value)}
                                required
                                style={{ height: '40px', padding: '0 12px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '13.5px', boxSizing: 'border-box' }}
                              />
                            </div>
                            <button
                              type="submit"
                              style={{ height: '40px', background: '#3D35C4', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', padding: '0 24px' }}
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

    </div>
  );
};

export default ApprovedInterns;
