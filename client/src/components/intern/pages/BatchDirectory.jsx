import React, { useState, useEffect } from 'react';
import { formatDate } from '../../../utils/formatDate';
import InternAvatar from '../../InternAvatar';
import { getInternById, getInternsByBatch, updateIntern } from '../../../services/internService';
import { getBatches } from '../../../services/batchService';
import { getProjectByInternId } from '../../../services/projectService';
import { getTasksByInternId } from '../../../services/taskService';
import { openExternalUrl, safeExternalUrl } from '../../../utils/safeUrl';

const BatchDirectory = ({ internId, internName, avatarUrl }) => {
  const [loading, setLoading] = useState(true);
  const [viewerIntern, setViewerIntern] = useState(null);
  const [batchVisibilityMode, setBatchVisibilityMode] = useState('intern_choice'); // 'public' | 'private' | 'intern_choice'
  const [teammates, setTeammates] = useState([]);
  const [selectedTeammate, setSelectedTeammate] = useState(null);

  // Tab details states
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'project' | 'tasks'
  const [teammateDetails, setTeammateDetails] = useState(null);
  const [teammateProject, setTeammateProject] = useState(null);
  const [teammateTasks, setTeammateTasks] = useState([]);
  const [loadingTeammateDetails, setLoadingTeammateDetails] = useState(false);

  // Projects map to show in left list row
  const [projectsMap, setProjectsMap] = useState({});
  const [errorMsg, setErrorMsg] = useState('');

  const fetchDirectoryData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // 1. Fetch current intern record to get batch and visibility settings
      const intern = await getInternById(internId);
      setViewerIntern(intern);

      // 2. Fetch current batch record to get visibility mode
      const batches = await getBatches();
      const batch = batches.find(b => b.batch_number === intern.batch_number);

      const visMode = batch ? batch.visibility_mode : 'intern_choice';
      setBatchVisibilityMode(visMode);

      // 3. Fetch approved teammates in same batch
      const approvedInterns = await getInternsByBatch(intern.batch_number);
      approvedInterns.sort((a, b) => a.name.localeCompare(b.name));

      // 4. Fetch projects to build a project title map
      const pm = {};
      await Promise.all(approvedInterns.map(async (mate) => {
        try {
          const proj = await getProjectByInternId(mate.id);
          if (proj) {
            pm[mate.id] = proj.title;
          }
        } catch (err) {
          console.error(`Failed to fetch project for mate ${mate.id}`, err);
        }
      }));
      setProjectsMap(pm);

      setTeammates(approvedInterns || []);

      // Determine default selected teammate (first visible mate)
      const visibleMates = (approvedInterns || []).filter(mate => {
        if (visMode === 'public') return true;
        if (visMode === 'intern_choice') {
          return mate.id === internId || mate.profile_visible;
        }
        return false;
      });

      if (visibleMates.length > 0) {
        setSelectedTeammate(visibleMates[0]);
      }
    } catch (err) {
      console.error('Error fetching directory data:', err.message);
      setErrorMsg('Failed to load directory data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (internId) {
      fetchDirectoryData();
    }
  }, [internId]);

  // Fetch projects and tasks for the selected teammate detail view
  const fetchTeammateDetails = async (mateId) => {
    setLoadingTeammateDetails(true);
    setTeammateDetails(null);
    setTeammateProject(null);
    setTeammateTasks([]);
    try {
      // Fetch details
      const detailsData = await getInternById(mateId);
      setTeammateDetails(detailsData);

      // Fetch project
      const projData = await getProjectByInternId(mateId);
      setTeammateProject(projData);

      // Fetch tasks
      const tasksData = await getTasksByInternId(mateId);
      if (tasksData) {
        tasksData.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
      }
      setTeammateTasks(tasksData || []);
    } catch (err) {
      console.error('Error fetching teammate project/tasks:', err.message);
    } finally {
      setLoadingTeammateDetails(false);
    }
  };

  useEffect(() => {
    if (selectedTeammate) {
      fetchTeammateDetails(selectedTeammate.id);
    }
  }, [selectedTeammate]);

  const handleToggleVisibility = async (visibleVal) => {
    if (!viewerIntern) return;
    try {
      const updated = {
        name: viewerIntern.name,
        college_name: viewerIntern.college_name,
        dept: viewerIntern.dept,
        year: viewerIntern.year,
        sem: viewerIntern.sem,
        mail: viewerIntern.mail,
        number: viewerIntern.number,
        starting_date: viewerIntern.starting_date,
        ending_date: viewerIntern.ending_date,
        batch_number: viewerIntern.batch_number,
        status: viewerIntern.status,
        profile_visible: visibleVal
      };
      await updateIntern(viewerIntern.id, updated);

      // Update local state reactively
      const updatedIntern = { ...viewerIntern, profile_visible: visibleVal };
      setViewerIntern(updatedIntern);

      // Update the teammates list for the current user's entry
      setTeammates(prev => prev.map(mate => mate.id === viewerIntern.id ? { ...mate, profile_visible: visibleVal } : mate));
    } catch (err) {
      alert('Failed to update visibility setting: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <div className="loading-spinner" role="status" aria-label="Loading teammates list" />
      </div>
    );
  }

  // Filter visible teammates in JS based on rules
  const visibleTeammates = teammates.filter(mate => {
    if (batchVisibilityMode === 'public') return true;
    if (batchVisibilityMode === 'intern_choice') {
      // Viewer themselves is always shown in their own sidebar list
      if (mate.id === internId) return true;
      return mate.profile_visible;
    }
    return false; // private mode -> nobody visible
  });

  const isPrivateByAdmin = batchVisibilityMode === 'private';

  // Task Status Badge rendering helper
  const renderStatusBadge = (status) => {
    let bg = '#FFF3E0';
    let color = '#E65100';
    let border = '1px solid #FFB74D';
    let text = 'Not Started';

    if (status === 'completed') {
      bg = '#E8F5E9';
      color = '#2E7D32';
      border = '1px solid #81C784';
      text = 'Completed';
    } else if (status === 'in_progress') {
      bg = '#E3F2FD';
      color = '#1565C0';
      border = '1px solid #64B5F6';
      text = 'In Progress';
    }

    return (
      <span style={{
        background: bg,
        color: color,
        border: border,
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
        display: 'inline-block'
      }}>
        {text}
      </span>
    );
  };

  return (
    <div style={{
      display: 'flex',
      gap: '16px',
      padding: '24px',
      boxSizing: 'border-box',
      width: '100%',
      minHeight: '100%'
    }}>
      {/* Left Panel: Sidebar Teammates List */}
      <div style={{
        width: '260px',
        minWidth: '260px',
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header Container */}
        <div style={{ borderBottom: '1px solid #F0F0F0' }}>
          {/* Header Texts */}
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#212121' }}>
              Batch Teammates
            </div>
            <div style={{ fontSize: '12px', color: '#9E9E9E', marginTop: '2px' }}>
              {isPrivateByAdmin ? '0 members' : `${visibleTeammates.length} members`}
            </div>
          </div>

          {/* Visibility toggle (only when visibility_mode = 'intern_choice') */}
          {!isPrivateByAdmin && batchVisibilityMode === 'intern_choice' && viewerIntern && (
            <div style={{ padding: '10px 16px', borderTop: '1px solid #F0F0F0' }}>
              <span style={{ fontSize: '18px', color: '#000000ff', marginBottom: '6px', display: 'block' }}>
                Your visibility:
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleToggleVisibility(true)}
                  style={{
                    background: viewerIntern.profile_visible ? '#3D35C4' : '#F5F5F5',
                    color: viewerIntern.profile_visible ? '#fff' : '#616161',
                    borderRadius: '8px',
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: viewerIntern.profile_visible ? '600' : '400',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Public
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleVisibility(false)}
                  style={{
                    background: !viewerIntern.profile_visible ? '#3D35C4' : '#F5F5F5',
                    color: !viewerIntern.profile_visible ? '#fff' : '#616161',
                    borderRadius: '8px',
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: !viewerIntern.profile_visible ? '600' : '400',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Private
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Intern list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {!isPrivateByAdmin && visibleTeammates.map((mate) => {
            const isSelected = selectedTeammate && selectedTeammate.id === mate.id;
            const isOwnRow = mate.id === internId;
            const initials = mate.name
              ? mate.name.split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase()
              : 'IN';
            const projTitle = projectsMap[mate.id];

            return (
              <div
                key={mate.id}
                onClick={() => setSelectedTeammate(mate)}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #FAFAFA',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: isSelected ? '#F0EEFF' : '#fff',
                  borderLeft: isSelected ? '3px solid #3D35C4' : '3px solid transparent',
                  transition: 'background 0.2s'
                }}
              >
                <InternAvatar
                  internId={mate.id}
                  name={mate.name}
                  size={40}
                  photoBust={mate._photoBust || ''}
                />

                {/* Right side */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#212121', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {mate.name}
                    </span>
                    {isOwnRow && (
                      <span style={{
                        background: '#3D35C4',
                        color: '#fff',
                        fontSize: '10px',
                        padding: '2px 7px',
                        borderRadius: '10px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        flexShrink: 0
                      }}>
                        YOU
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', color: '#9E9E9E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {projTitle || 'No project yet'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Panel: Content Section */}
      <div style={{
        flex: 1,
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {isPrivateByAdmin ? (
          /* Blocked state for private visibility mode */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            padding: '40px',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '40px', marginBottom: '12px' }}>🔒</span>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#757575', margin: '0 0 8px 0' }}>
              Profiles Unavailable
            </h3>
            <p style={{ fontSize: '15px', color: '#757575', margin: 0 }}>
              The admin has set this batch to private.
            </p>
          </div>
        ) : selectedTeammate ? (
          <>
            {/* Tabs Row */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid #E0E0E0',
              padding: '0 24px'
            }}>
              {[
                { tab: 'details', label: 'Details' },
                { tab: 'project', label: 'Project' },
                { tab: 'tasks', label: 'Tasks' }
              ].map(({ tab, label }) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === tab ? '2px solid #3D35C4' : '2px solid transparent',
                    color: activeTab === tab ? '#3D35C4' : '#757575',
                    fontWeight: activeTab === tab ? '600' : '400',
                    fontSize: '14px',
                    padding: '14px 20px',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              {loadingTeammateDetails ? (
                <div style={{ display: 'flex', height: '200px', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="loading-spinner" role="status" aria-label="Loading teammate details" />
                </div>
              ) : (
                <>
                  {/* DETAILS TAB */}
                  {activeTab === 'details' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {/* Header profile section */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        marginBottom: '28px'
                      }}>
                        <InternAvatar
                          internId={teammateDetails?.id || selectedTeammate.id}
                          name={teammateDetails?.name || selectedTeammate.name}
                          size={80}
                          photoBust={teammateDetails?._photoBust || selectedTeammate._photoBust || ''}
                          style={{
                            border: '3px solid #EEEEEE',
                          }}
                        />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '20px', fontWeight: '700', color: '#212121' }}>
                            {teammateDetails?.name || selectedTeammate.name}
                          </span>
                          <span style={{ fontSize: '13px', color: '#757575' }}>
                            {teammateDetails?.dept || selectedTeammate.dept} — {teammateDetails?.college_name || selectedTeammate.college_name}
                          </span>

                        </div>
                      </div>

                      {/* Info fields */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {[
                          { label: 'NAME', value: teammateDetails?.name || selectedTeammate.name },
                          { label: 'COLLEGE', value: teammateDetails?.college_name || selectedTeammate.college_name },
                          { label: 'DEPARTMENT', value: teammateDetails?.dept || selectedTeammate.dept }
                        ].map(({ label, value }) => (
                          <div key={label} style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{
                              fontSize: '11px',
                              fontWeight: '600',
                              color: '#9E9E9E',
                              letterSpacing: '0.5px',
                              textTransform: 'uppercase',
                              marginBottom: '4px'
                            }}>
                              {label}
                            </label>
                            <div style={{
                              fontSize: '14px',
                              color: '#212121',
                              padding: '10px 12px',
                              background: '#F9F9F9',
                              borderRadius: '6px',
                              border: '1px solid #E0E0E0',
                              minHeight: '38px',
                              boxSizing: 'border-box',
                              display: 'flex',
                              alignItems: 'center'
                            }}>
                              {value || '—'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* PROJECT TAB */}
                  {activeTab === 'project' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {!teammateProject ? (
                        <div style={{
                          color: '#9E9E9E',
                          textAlign: 'center',
                          padding: '40px',
                          fontSize: '14px'
                        }}>
                          No project assigned yet.
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{
                              fontSize: '11px',
                              fontWeight: '600',
                              color: '#9E9E9E',
                              letterSpacing: '0.5px',
                              textTransform: 'uppercase',
                              marginBottom: '4px'
                            }}>
                              PROJECT TITLE
                            </label>
                            <div style={{
                              fontSize: '14px',
                              color: '#212121',
                              padding: '10px 12px',
                              background: '#F9F9F9',
                              borderRadius: '6px',
                              border: '1px solid #E0E0E0'
                            }}>
                              {teammateProject.title || '—'}
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{
                              fontSize: '11px',
                              fontWeight: '600',
                              color: '#9E9E9E',
                              letterSpacing: '0.5px',
                              textTransform: 'uppercase',
                              marginBottom: '4px'
                            }}>
                              DESCRIPTION
                            </label>
                            <div style={{
                              fontSize: '14px',
                              color: '#212121',
                              padding: '10px 12px',
                              background: '#F9F9F9',
                              borderRadius: '6px',
                              border: '1px solid #E0E0E0',
                              minHeight: '80px',
                              lineHeight: '1.5',
                              whiteSpace: 'pre-wrap'
                            }}>
                              {teammateProject.description || '—'}
                            </div>
                          </div>

                          {/* Link Buttons */}
                          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                            {safeExternalUrl(teammateProject.git_repo_link) ? (
                              <button
                                type="button"
                                onClick={() => openExternalUrl(teammateProject.git_repo_link)}
                                style={{
                                  background: '#3E75C3',
                                  color: '#F0EEFF',
                                  border: '1px solid #3D35C4',
                                  borderRadius: '8px',
                                  padding: '8px 16px',
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}
                              >
                                <i className="ti ti-brand-github" /> Git Repository
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled
                                style={{
                                  background: '#3E75C3',
                                  color: '#F0EEFF',
                                  border: '1px solid #E0E0E0',
                                  borderRadius: '8px',
                                  padding: '8px 16px',
                                  fontSize: '13px',
                                  cursor: 'not-allowed',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}
                              >
                                <i className="ti ti-brand-github" /> Git Repository
                              </button>
                            )}

                            {safeExternalUrl(teammateProject.live_project_link) ? (
                              <button
                                type="button"
                                onClick={() => openExternalUrl(teammateProject.live_project_link)}
                                style={{
                                  background: '#2E6F40',
                                  color: 'white',
                                  border: '1px solid #3D35C4',
                                  borderRadius: '8px',
                                  padding: '8px 16px',
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}
                              >
                                <i className="ti ti-external-link" /> Live Project
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled
                                style={{
                                  background: '#3E75C3',
                                  color: 'white',
                                  border: '1px solid #E0E0E0',
                                  borderRadius: '8px',
                                  padding: '8px 16px',
                                  fontSize: '13px',
                                  cursor: 'not-allowed',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}
                              >
                                <i className="ti ti-external-link" /> Live Project
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* TASKS TAB */}
                  {activeTab === 'tasks' && (
                    <div style={{
                      width: '100%',
                      background: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E0E0E0',
                      overflow: 'hidden',
                      boxSizing: 'border-box',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>

                      {/* Section 1: CURRENT ASSIGNED WORK */}
                      <div>
                        <div style={{
                          background: 'linear-gradient(135deg, #EEF2FF 0%, #E8EAFF 100%)',
                          padding: '12px 20px',
                          borderRadius: '8px 8px 0 0'
                        }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            color: '#5C6BC0',
                            letterSpacing: '1.5px',
                            textTransform: 'uppercase'
                          }}>
                            Current Assigned Work
                          </span>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
                            <thead>
                              <tr style={{ fontSize: '12px', color: '#9E9E9E', fontWeight: 600, borderBottom: '1px solid #F0F0F0' }}>
                                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Task</th>
                                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Expected Date</th>
                                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                const currentTask = teammateTasks.find(t => t.status !== 'completed');
                                return currentTask ? (
                                  <tr style={{ borderBottom: '1px solid #FAFAFA', background: '#EEF4FF' }}>
                                    <td style={{ padding: '12px', fontSize: '13px', color: '#212121' }}>{currentTask.title}</td>
                                    <td style={{ padding: '12px', fontSize: '13px', color: '#212121' }}>{formatDate(currentTask.expected_date)}</td>
                                    <td style={{ padding: '12px', fontSize: '13px', color: '#212121' }}>
                                      {renderStatusBadge(currentTask.status)}
                                    </td>
                                  </tr>
                                ) : (
                                  <tr>
                                    <td colSpan={3} style={{ padding: '20px', color: '#9E9E9E', fontSize: '13px', textAlign: 'center' }}>
                                      No tasks in this section.
                                    </td>
                                  </tr>
                                );
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Section 2: UPCOMING TASKS */}
                      <div>
                        <div style={{
                          background: 'linear-gradient(135deg, #FFF8E1 0%, #FFF3CC 100%)',
                          padding: '12px 20px'
                        }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            color: '#F9A825',
                            letterSpacing: '1.5px',
                            textTransform: 'uppercase'
                          }}>
                            Upcoming Tasks
                          </span>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
                            <thead>
                              <tr style={{ fontSize: '12px', color: '#9E9E9E', fontWeight: 600, borderBottom: '1px solid #F0F0F0' }}>
                                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Task</th>
                                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Expected Date</th>
                                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Status badge</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                const activeTask = teammateTasks.find(t => t.status !== 'completed');
                                const upcomingList = teammateTasks.filter(t => t.status !== 'completed' && t.id !== activeTask?.id);
                                return upcomingList.length > 0 ? (
                                  upcomingList.map((task, index) => (
                                    <tr
                                      key={task.id}
                                      style={{
                                        borderBottom: '1px solid #FAFAFA',
                                        background: index % 2 === 1 ? '#FAFAFA' : 'transparent'
                                      }}
                                    >
                                      <td style={{ padding: '12px', fontSize: '13px', color: '#212121' }}>{task.title}</td>
                                      <td style={{ padding: '12px', fontSize: '13px', color: '#212121' }}>{formatDate(task.expected_date)}</td>
                                      <td style={{ padding: '12px', fontSize: '13px', color: '#212121' }}>
                                        {renderStatusBadge(task.status)}
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan={3} style={{ padding: '20px', color: '#9E9E9E', textAlign: 'center', fontSize: '13px' }}>
                                      No upcoming tasks queued.
                                    </td>
                                  </tr>
                                );
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Section 3: FINISHED WORKS */}
                      <div>
                        <div style={{
                          background: 'linear-gradient(135deg, #F1F8E9 0%, #E8F5E9 100%)',
                          padding: '12px 20px'
                        }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            color: '#558B2F',
                            letterSpacing: '1.5px',
                            textTransform: 'uppercase'
                          }}>
                            Finished Works
                          </span>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
                            <thead>
                              <tr style={{ fontSize: '12px', color: '#9E9E9E', fontWeight: 600, borderBottom: '1px solid #F0F0F0' }}>
                                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Task</th>
                                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Expected Date</th>
                                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Completion Date</th>
                                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Status badge</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                const finishedList = teammateTasks.filter(t => t.status === 'completed');
                                return finishedList.length > 0 ? (
                                  finishedList.map((task, index) => (
                                    <tr
                                      key={task.id}
                                      style={{
                                        borderBottom: '1px solid #FAFAFA',
                                        background: index % 2 === 1 ? '#FAFAFA' : 'transparent'
                                      }}
                                    >
                                      <td style={{ padding: '12px', fontSize: '13px', color: '#212121' }}>{task.title}</td>
                                      <td style={{ padding: '12px', fontSize: '13px', color: '#212121' }}>{formatDate(task.expected_date)}</td>
                                      <td style={{ padding: '12px', fontSize: '13px', color: '#212121' }}>{formatDate(task.submission_date)}</td>
                                      <td style={{ padding: '12px', fontSize: '13px', color: '#212121' }}>
                                        {renderStatusBadge(task.status)}
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan={4} style={{ padding: '20px', color: '#9E9E9E', textAlign: 'center', fontSize: '13px' }}>
                                      No finished tasks yet.
                                    </td>
                                  </tr>
                                );
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            padding: '40px',
            textAlign: 'center',
            color: '#9E9E9E'
          }}>
            No teammates found in this batch.
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchDirectory;
