import { useState, useEffect } from 'react';
import InternSidebar from './InternSidebar';
import InternHeader from './InternHeader';
import { supabase } from '../../supabase/client';
import { getTasksByInternId, updateTaskStatus } from '../../services/taskService';
import './InternLayout.css';

// We import subpages directly
import InternProfilePage from './pages/InternProfile';
import InternProjectPage from './pages/InternProject';
import InternTasksPage from './pages/InternTasks';

const InternLayout = ({ onLogout }) => {
  const [internData, setInternData] = useState(null);
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [activePage, setActivePage] = useState('profile'); // 'profile' | 'project' | 'tasks'
  const [loading, setLoading] = useState(true);

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

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      width: '100vw',
      overflow: 'hidden'
    }}>
      {/* Sidebar — fixed width */}
      <div style={{
        width: '220px',
        flexShrink: 0,
        position: 'fixed',
        left: 0,
        top: 0,
        height: '100vh',
        background: '#3D35C4',
        zIndex: 100
      }}>
        <InternSidebar
          activePage={activePage}
          setActivePage={setActivePage}
          onLogout={handleLogoutClick}
        />
      </div>

      {/* Main content — takes ALL remaining width */}
      <div style={{
        marginLeft: '220px',
        flex: 1,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        width: 'calc(100vw - 220px)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <InternHeader
          activePage={activePage}
          internData={internData}
          internName={internData?.name || ''}
          photoUrl={internData?.photo_url || ''}
        />

        {/* Page content */}
        <div style={{
          flex: 1,
          padding: '24px 32px',
          boxSizing: 'border-box',
          width: '100%',
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
                <InternProfilePage internData={internData} />
              )}
              {activePage === 'project' && (
                <InternProjectPage project={project} />
              )}
              {activePage === 'tasks' && (
                <InternTasksPage 
                  tasks={tasks} 
                  internId={internData?.id}
                  onUpdateTaskStatus={handleUpdateTaskStatus} 
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InternLayout;
