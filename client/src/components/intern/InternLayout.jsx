import { useState, useEffect } from 'react';
import { supabase } from '../../supabase/client';
import { getTasksByInternId, updateTaskStatus } from '../../services/taskService';
import './InternLayout.css';

// We import subpages directly
import InternProfilePage from './pages/InternProfile';
import InternProjectPage from './pages/InternProject';
import InternTasksPage from './pages/InternTasks';
import BatchDirectory from './pages/BatchDirectory';

const InternLayout = ({ onLogout }) => {
  const [internData, setInternData] = useState(null);
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [activePage, setActivePage] = useState('profile'); // 'profile' | 'project' | 'tasks' | 'directory'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!window.history.state || window.history.state.activePage !== activePage) {
      window.history.pushState({ ...window.history.state, activePage }, '');
    }
  }, [activePage]);

  useEffect(() => {
    const handlePop = (e) => {
      if (e.state && e.state.activePage) {
        setActivePage(e.state.activePage);
      }
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  const fetchInternData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user is currently authenticated.');

      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('intern_id')
        .eq('id', user.id)
        .single();
      if (profileErr) throw profileErr;

      const { data: intern, error: internErr } = await supabase
        .from('interns')
        .select('*')
        .eq('id', profile.intern_id)
        .single();
      if (internErr) throw internErr;

      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .eq('intern_id', profile.intern_id)
        .maybeSingle();

      const tasksData = await getTasksByInternId(profile.intern_id);

      setInternData(intern);
      setProject(projectData);
      setTasks(tasksData || []);
    } catch (err) {
      console.error('Error fetching intern data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInternData();
  }, []);

  const handleUpdateTaskStatus = async (taskId, newStatus, submissionDate = null) => {
    try {
      const updatedTask = await updateTaskStatus(taskId, newStatus, submissionDate);

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? updatedTask : t))
      );
    } catch (err) {
      console.error('Error updating task status:', err.message);
      alert(`Failed to update task status: ${err.message}`);
    }
  };

  const handleLogoutClick = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      console.error('Logout error:', err.message);
    }
    onLogout();
  };

  const activeTabStyle = {
    background: 'rgba(255, 255, 255, 0.2)',
    color: '#fff',
    borderRadius: '8px',
    padding: '7px 16px',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    border: 'none',
    cursor: 'pointer',
    outline: 'none'
  };

  const inactiveTabStyle = {
    background: 'transparent',
    color: 'rgba(255, 255, 255, 0.7)',
    borderRadius: '8px',
    padding: '7px 16px',
    fontSize: '14px',
    fontWeight: 500,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    border: 'none',
    cursor: 'pointer',
    outline: 'none',
    transition: 'background 0.2s, color 0.2s'
  };

  const initials = internData?.name
    ? internData.name.split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'IN';

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Top Header Bar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        height: '56px',
        background: '#3D35C4',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        boxSizing: 'border-box'
      }}>
        {/* Left side — Navigation tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {[
            { id: 'profile', label: 'My Profile' },
            { id: 'project', label: 'My Project' },
            { id: 'tasks', label: 'My Tasks' },
            { id: 'directory', label: 'Teammates Profile' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActivePage(tab.id)}
              style={activePage === tab.id ? activeTabStyle : inactiveTabStyle}
              onMouseEnter={(e) => {
                if (activePage !== tab.id) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.color = '#fff';
                }
              }}
              onMouseLeave={(e) => {
                if (activePage !== tab.id) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Intern avatar + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {internData?.photo_url || internData?.photo ? (
              <img
                src={internData.photo_url || internData.photo}
                alt={internData.name}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  flexShrink: 0
                }}
              />
            ) : (
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {initials}
              </div>
            )}
            <span style={{
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}>
              {internData?.name || ''}
            </span>
          </div>

          {/* Logout button */}
          <button
            type="button"
            onClick={handleLogoutClick}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              borderRadius: '8px',
              padding: '7px 14px',
              fontSize: '13px',
              fontWeight: 600,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              border: '1px solid rgba(255, 255, 255, 0.3)',
              cursor: 'pointer',
              outline: 'none',
              marginLeft: '8px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{
        marginTop: '56px',
        height: 'calc(100vh - 56px)',
        overflowY: 'auto',
        width: '100vw',
        boxSizing: 'border-box',
        padding: '24px',
        background: 'radial-gradient(circle at 15% 20%, rgba(232, 230, 248, 0.6) 0%, transparent 35%), radial-gradient(circle at 85% 80%, rgba(253, 246, 236, 0.6) 0%, transparent 35%), #FFFFFF',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {loading ? (
          <div className="spinner-container">
            <div className="loading-spinner" role="status" aria-label="Loading details" />
          </div>
        ) : (
          <>
            {activePage === 'profile' && (
              <InternProfilePage
                internData={internData}
                internName={internData?.name || ''}
                avatarUrl={internData?.photo_url || ''}
              />
            )}
            {activePage === 'project' && (
              <InternProjectPage
                project={project}
                internName={internData?.name || ''}
                avatarUrl={internData?.photo_url || ''}
              />
            )}
            {activePage === 'tasks' && (
              <InternTasksPage
                tasks={tasks}
                internId={internData?.id}
                onUpdateTaskStatus={handleUpdateTaskStatus}
                internName={internData?.name || ''}
                avatarUrl={internData?.photo_url || ''}
              />
            )}
            {activePage === 'directory' && (
              <BatchDirectory
                internId={internData?.id}
                supabase={supabase}
                internName={internData?.name || ''}
                avatarUrl={internData?.photo_url || ''}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default InternLayout;
