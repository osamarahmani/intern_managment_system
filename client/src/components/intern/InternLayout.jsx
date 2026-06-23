import { useState, useEffect } from 'react';
import { getInternId } from '../../services/authService';
import { getInternById } from '../../services/internService';
import { getProjectByInternId } from '../../services/projectService';
import { getTasksByInternId, updateTask } from '../../services/taskService';
import './InternLayout.css';
import InternAvatar from '../InternAvatar';

// Import subpages
import InternProfilePage from './pages/InternProfile';
import InternProjectPage from './pages/InternProject';
import InternTasksPage from './pages/InternTasks';
import BatchDirectory from './pages/BatchDirectory';
// import ExitFeedbackForm from './ExitFeedbackForm';

const InternLayout = ({ onLogout }) => {
  const [internData, setInternData] = useState(null);
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [activePage, setActivePage] = useState('profile');
  const [loading, setLoading] = useState(true);

  // Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      const internId = getInternId();
      if (!internId) throw new Error('No intern ID found in local storage.');

      const intern = await getInternById(internId);
      const projectData = await getProjectByInternId(internId);
      const tasksData = await getTasksByInternId(internId);

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
      const existingTask = tasks.find((t) => t.id === taskId);
      if (!existingTask) return;

      await updateTask(taskId, {
        status: newStatus,
        submission_date: submissionDate,
        title: existingTask.title,
        expected_date: existingTask.expected_date,
        upcoming_task: existingTask.upcoming_task
      });

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus, submission_date: submissionDate } : t))
      );
    } catch (err) {
      console.error('Error updating task status:', err.message);
      alert(`Failed to update task status: ${err.message}`);
    }
  };

  const handleTabClick = (tabId) => {
    setActivePage(tabId);
    setIsMobileMenuOpen(false); // Close drawer on mobile after selection
  };

  return (
    <div className="app-layout-wrapper">
      {/* Top Header Bar */}
      <header className="app-top-header">

        {/* Mobile Hamburger Button */}
        <button
          className="mobile-hamburger-btn"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle navigation menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {isMobileMenuOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </>
            ) : (
              <>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </>
            )}
          </svg>
        </button>

        {/* Navigation Tabs (Desktop Inline, Mobile Drawer) */}
        <nav className={`app-nav-tabs ${isMobileMenuOpen ? 'open' : ''}`}>
          {[
            { id: 'profile', label: 'My Profile' },
            { id: 'project', label: 'My Project' },
            { id: 'tasks', label: 'My Tasks' },
            { id: 'directory', label: 'Teammates Profile' },
            // ...(internData?.intern_status === 'completed' ? [{ id: 'exit-feedback', label: 'Exit Feedback' }] : [])
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab.id)}
              className={`app-nav-btn ${activePage === tab.id ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Mobile Overlay Background */}
        <div
          className={`mobile-nav-overlay ${isMobileMenuOpen ? 'open' : ''}`}
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* Right side: User info & Logout */}
        <div className="app-header-right">
          <div className="app-user-info">
            <InternAvatar
              internId={internData?.id}
              name={internData?.name}
              size={34}
              photoBust={internData?._photoBust || ''}
              style={{ border: '1.5px solid rgba(255, 255, 255, 0.25)' }}
            />
            <span className="app-user-name">
              {internData?.name || 'Intern'}
            </span>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="app-logout-btn"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="app-main-content">
        {loading ? (
          <div className="spinner-container">
            <div className="loading-spinner" role="status" aria-label="Loading details" />
          </div>
        ) : (
          <div className="app-page-wrapper">
            {activePage === 'profile' && <InternProfilePage internData={internData} internName={internData?.name || ''} />}
            {activePage === 'project' && <InternProjectPage project={project} internName={internData?.name || ''} />}
            {activePage === 'tasks' && <InternTasksPage tasks={tasks} internId={internData?.id} onUpdateTaskStatus={handleUpdateTaskStatus} internName={internData?.name || ''} />}
            {activePage === 'directory' && <BatchDirectory internId={internData?.id} internName={internData?.name || ''} />}
            {activePage === 'exit-feedback' && <ExitFeedbackForm internName={internData?.name || ''} internId={internData?.id} />}
          </div>
        )}
      </main>
    </div>
  );
};

export default InternLayout;