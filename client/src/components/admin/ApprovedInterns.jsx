import { useState, useEffect } from 'react';
import { supabase } from '../../supabase/client';

const ApprovedInterns = () => {
  // Navigation & View States
  const [activeView, setActiveView] = useState('batches'); // 'batches' | 'batchDetails'
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedIntern, setSelectedIntern] = useState(null);

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
  const [activeTab, setActiveTab] = useState('project'); // 'project' | 'tasks'
  const [assignWork, setAssignWork] = useState('');
  const [expectedDate, setExpectedDate] = useState('');

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
      setActiveTab('project');
    }
  }, [selectedBatch]);

  // 3. Fetch projects and tasks reactively when the active selected intern changes
  useEffect(() => {
    if (selectedIntern) {
      fetchInternDetails(selectedIntern.id);
      // Reset forms
      resetProjectForm();
      resetTaskForm();
      setActiveTab('project');
    }
  }, [selectedIntern]);

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
    <div style={{ flex: 1, width: '100%', boxSizing: 'border-box' }}>
      
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

          {/* View 2 Layout Columns: Intern Sidebar (35%) vs Management Panel (65%) */}
          <div style={{ display: 'grid', gridTemplateColumns: '35% 65%', gap: '24px', alignItems: 'start' }}>
            
            {/* Left Column: Intern List Sidebar */}
            <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #E0E0E0', minHeight: '400px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#212121', marginBottom: '14px', marginTop: 0 }}>Approved Interns</h3>

              {interns.length === 0 ? (
                <p style={{ color: '#9E9E9E', fontSize: '12px', textAlign: 'center', padding: '40px 0' }}>No approved interns in this batch.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {interns.map((intern) => {
                    const isSelected = selectedIntern && selectedIntern.id === intern.id;
                    return (
                      <div
                        key={intern.id}
                        onClick={() => setSelectedIntern(intern)}
                        style={{
                          padding: '12px',
                          borderRadius: '8px',
                          border: isSelected ? '1px solid #3D35C4' : '1px solid #EEEEEE',
                          background: isSelected ? 'rgba(61, 53, 196, 0.04)' : '#FFFFFF',
                          cursor: 'pointer',
                          transition: 'border-color 0.2s'
                        }}
                      >
                        <h4 style={{ fontSize: '13.5px', fontWeight: '600', color: isSelected ? '#3D35C4' : '#212121', margin: '0 0 4px 0' }}>{intern.name}</h4>
                        <p style={{ fontSize: '11px', color: '#757575', margin: 0 }}>{intern.mail}</p>
                        <span style={{
                          display: 'inline-block',
                          fontSize: '9.5px',
                          background: '#E6F4EA',
                          color: '#137333',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: '700',
                          marginTop: '6px',
                          textTransform: 'uppercase'
                        }}>
                          approved
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Intern Management Panels */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {selectedIntern ? (
                <>
                  {/* Panel A: Intern Profile Information Card */}
                  <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '12px', border: '1px solid #E0E0E0', boxShadow: '0 2px 12px rgba(0,0,0,0.01)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#212121', margin: '0 0 4px 0' }}>{selectedIntern.name}</h3>
                        <p style={{ fontSize: '13px', color: '#757575', margin: '0 0 4px 0' }}>Email: {selectedIntern.mail}</p>
                        <p style={{ fontSize: '13px', color: '#757575', margin: 0 }}>College: {selectedIntern.college_name || selectedIntern.collegeName || 'N/A'}</p>
                      </div>

                      <span style={{
                        fontSize: '11px',
                        background: '#E6F4EA',
                        color: '#137333',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontWeight: '700',
                        textTransform: 'uppercase'
                      }}>
                        approved
                      </span>
                    </div>
                  </div>

                  {/* Tabs Header */}
                  <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E0E0E0', marginBottom: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setActiveTab('project')}
                      style={{
                        padding: '10px 16px',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'project' ? '2px solid #3D35C4' : '2px solid transparent',
                        color: activeTab === 'project' ? '#3D35C4' : '#757575',
                        fontWeight: '600',
                        fontSize: '14px',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      Project
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('tasks')}
                      style={{
                        padding: '10px 16px',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'tasks' ? '2px solid #3D35C4' : '2px solid transparent',
                        color: activeTab === 'tasks' ? '#3D35C4' : '#757575',
                        fontWeight: '600',
                        fontSize: '14px',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      Tasks
                    </button>
                  </div>

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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      
                      {/* Section 1: Current active task card */}
                      <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '12px', border: '1px solid #E0E0E0', boxShadow: '0 2px 12px rgba(0,0,0,0.01)' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#212121', marginBottom: '16px', marginTop: 0 }}>Current Assigned Work</h3>
                        
                        {tasks.find(t => t.status !== 'completed') ? (
                          (() => {
                            const activeTask = tasks.find(t => t.status !== 'completed');
                            return (
                              <div style={{ background: '#E8F4FD', padding: '16px', border: '1px solid #B3D7FF', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                                  <h4 style={{ fontSize: '14.5px', fontWeight: '700', color: '#1565C0', margin: 0 }}>{activeTask.title}</h4>
                                  <span style={{ fontSize: '10px', background: '#E8F4FD', color: '#1565C0', border: '1px solid #1565C0', padding: '2px 8px', borderRadius: '4px', fontWeight: '700', textTransform: 'uppercase' }}>
                                    In Progress
                                  </span>
                                </div>
                                <p style={{ fontSize: '13px', color: '#1565C0', margin: '0 0 6px 0' }}>
                                  Expected Completion Date: <strong>{activeTask.expected_date}</strong>
                                </p>
                              </div>
                            );
                          })()
                        ) : (
                          <p style={{ color: '#9E9E9E', fontSize: '13px', margin: 0 }}>No active task in progress.</p>
                        )}
                      </div>

                      {/* Section 2: Finished Works list */}
                      <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '12px', border: '1px solid #E0E0E0', boxShadow: '0 2px 12px rgba(0,0,0,0.01)' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#212121', marginBottom: '16px', marginTop: 0 }}>Finished Works</h3>
                        
                        {tasks.filter(t => t.status === 'completed').length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {tasks.filter(t => t.status === 'completed').map((task) => (
                              <div key={task.id} style={{ background: '#F9FBF9', padding: '14px', border: '1px solid #E2EFE2', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <h4 style={{ fontSize: '13.5px', fontWeight: '600', color: '#2E7D32', margin: '0 0 4px 0' }}>{task.title}</h4>
                                  <span style={{ fontSize: '11px', color: '#757575' }}>
                                    Completed Date: <strong>{task.submission_date}</strong>
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

                      {/* Section 3: Upcoming Tasks list */}
                      <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '12px', border: '1px solid #E0E0E0', boxShadow: '0 2px 12px rgba(0,0,0,0.01)' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#212121', marginBottom: '16px', marginTop: 0 }}>Upcoming Tasks</h3>
                        
                        {(() => {
                          const activeTask = tasks.find(t => t.status !== 'completed');
                          const upcomingList = tasks.filter(t => t.status !== 'completed' && t.id !== activeTask?.id);
                          
                          return upcomingList.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {upcomingList.map((task) => (
                                <div key={task.id} style={{ background: '#FFFBF5', padding: '14px', border: '1px solid #FFEED9', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                    <h4 style={{ fontSize: '13.5px', fontWeight: '600', color: '#E65100', margin: '0 0 4px 0' }}>{task.title}</h4>
                                    <span style={{ fontSize: '11px', color: '#757575' }}>
                                      Expected Date: <strong>{task.expected_date}</strong>
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '10px', background: '#FFF3E0', color: '#E65100', border: '1px solid #E65100', padding: '2px 8px', borderRadius: '4px', fontWeight: '700', textTransform: 'uppercase' }}>
                                      Upcoming
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteTask(task.id)}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                      title="Delete Task"
                                    >
                                      <i className="ti ti-trash" style={{ color: '#D32F2F', fontSize: '18px' }} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p style={{ color: '#9E9E9E', fontSize: '13px', margin: 0 }}>No upcoming tasks queued.</p>
                          );
                        })()}
                      </div>

                      {/* Section 4: Assign New Task form */}
                      <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '12px', border: '1px solid #E0E0E0', boxShadow: '0 2px 12px rgba(0,0,0,0.01)' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#212121', marginBottom: '16px', marginTop: 0 }}>Assign New Task</h3>
                        
                        <form onSubmit={handleAssignTask} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '600', color: '#212121' }}>Assign Work</label>
                            <input
                              type="text"
                              placeholder="Describe the task to assign"
                              value={assignWork}
                              onChange={(e) => setAssignWork(e.target.value)}
                              required
                              style={{ height: '38px', padding: '0 12px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '13.5px', boxSizing: 'border-box' }}
                            />
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '600', color: '#212121' }}>Expected Finish Date</label>
                            <input
                              type="date"
                              value={expectedDate}
                              onChange={(e) => setExpectedDate(e.target.value)}
                              required
                              style={{ height: '38px', padding: '0 12px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '13.5px', boxSizing: 'border-box' }}
                            />
                          </div>

                          <button
                            type="submit"
                            style={{ height: '38px', background: '#3D35C4', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', alignSelf: 'flex-start', padding: '0 24px', marginTop: '4px' }}
                          >
                            Assign Task
                          </button>
                        </form>
                      </div>

                    </div>
                  )}
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
