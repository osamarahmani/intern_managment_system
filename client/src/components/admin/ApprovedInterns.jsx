import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabase/client';
import { formatDate } from '../../utils/formatDate';

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
    if (!window.confirm('Are you sure you want to delete this task?')) return;
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: '700', color: '#111111', margin: 0 }}>Batch Operations Console</h2>
            <p style={{ fontSize: '14px', color: '#757575', margin: 0 }}>Provision registration keys and inspect active batches</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '30px', alignItems: 'start' }}>
            
            {/* Create Batch Form Panel */}
            <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '12px', border: '1px solid #E0E0E0', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#212121', marginBottom: '16px', marginTop: 0 }}>Provision New Batch</h3>
              
              {successMsg && <div style={{ background: '#E6F4EA', color: '#137333', padding: '10px 12px', borderRadius: '6px', fontSize: '13px', marginBottom: '14px', fontWeight: '500' }}>{successMsg}</div>}
              {errorMsg && <div style={{ background: '#FCE8E6', color: '#C5221F', padding: '10px 12px', borderRadius: '6px', fontSize: '13px', marginBottom: '14px', fontWeight: '500' }}>{errorMsg}</div>}

              <form onSubmit={handleCreateBatch} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#212121' }}>Batch Identifier / Number</label>
                  <input
                    type="text"
                    placeholder="e.g. BATCH-2024-SUMMER"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    required
                    style={{ height: '38px', padding: '0 12px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '14px' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#212121' }}>Registration Key</label>
                  <input
                    type="text"
                    placeholder="e.g. key_sum_902"
                    value={registrationKey}
                    onChange={(e) => setRegistrationKey(e.target.value)}
                    required
                    style={{ height: '38px', padding: '0 12px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '14px' }}
                  />
                </div>

                <button
                  type="submit"
                  style={{ height: '40px', background: '#3D35C4', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}
                >
                  Generate Batch
                </button>
              </form>
            </div>

            {/* Existing Batches List Panel */}
            <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '12px', border: '1px solid #E0E0E0', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#212121', marginBottom: '16px', marginTop: 0 }}>Registered Batches ({batches.length})</h3>

              {batches.length === 0 ? (
                <p style={{ color: '#9E9E9E', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>No batches provisioned yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {batches.map((batch) => (
                    <div
                      key={batch.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '14px 16px',
                        border: '1px solid #EEEEEE',
                        borderRadius: '8px',
                        background: '#FAFAFA'
                      }}
                    >
                      <div
                        onClick={() => {
                          setSelectedBatch(batch);
                          setActiveView('batchDetails');
                        }}
                        style={{ cursor: 'pointer', flex: 1 }}
                        title="Click to view batch details and approved interns list"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: '700', fontSize: '14px', color: '#3D35C4', textDecoration: 'underline' }}>{batch.batch_number}</span>
                          <span style={{ fontSize: '11px', background: batch.is_active ? '#E6F4EA' : '#F1F3F4', color: batch.is_active ? '#137333' : '#5F6368', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>
                            {batch.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#757575', margin: '4px 0 0 0' }}>Key: <code style={{ background: '#EAEAEA', padding: '2px 4px', borderRadius: '3px' }}>{batch.registration_key}</code></p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleBatchStatus(batch)}
                        style={{
                          background: batch.is_active ? '#FCE8E6' : '#E8F0FE',
                          color: batch.is_active ? '#C5221F' : '#1A73E8',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontWeight: '600',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        {batch.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  ))}
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
                {[0,1,2].map(i => (
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
                        {/* Status badge row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#212121', margin: 0 }}>
                            Intern Details
                          </h3>
                          <span style={{
                            fontSize: '11px',
                            background: '#E6F4EA',
                            color: '#137333',
                            padding: '3px 10px',
                            borderRadius: '4px',
                            fontWeight: '700',
                            textTransform: 'uppercase'
                          }}>
                            {selectedIntern.status}
                          </span>
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
                              {[1,2,3,4,5,6,7,8].map(s => (
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
                                          onClick={() => handleDeleteTask(task.id)}
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
