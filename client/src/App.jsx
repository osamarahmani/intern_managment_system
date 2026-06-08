import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminLayout from './components/admin/AdminLayout';
import InternLayout from './components/intern/InternLayout';
import { apiFetch, getRole } from './services/api';

function App() {
  const [page, setPage] = useState('login'); // 'login' | 'register' | 'admin' | 'intern'
  const [userRole, setUserRole] = useState(null);
  
  // Registration Stepper States
  const [currentStep, setCurrentStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    collegeName: '',
    dept: '',
    year: '',
    sem: '',
    mail: '',
    number: '',
    photo: null,
    startingDate: '',
    endingDate: '',
    batchNumber: '',
    registrationKey: '',
    password: '',
    confirmPassword: ''
  });

  // Admin Dashboard States
  const [interns, setInterns] = useState([]);
  const [selectedIntern, setSelectedIntern] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('basicInfo');

  // Sync currentView and userRole state with the browser history
  useEffect(() => {
    const currentView = page;
    const role = page === 'admin' ? 'admin' : (page === 'intern' ? 'intern' : 'guest');
    const state = { userRole: role, currentView };
    if (!window.history.state || window.history.state.currentView !== currentView) {
      window.history.pushState(state, '');
    }
  }, [page]);

  // On browser back/forward, restore state
  useEffect(() => {
    const handlePop = (e) => {
      if (e.state && e.state.currentView) {
        setPage(e.state.currentView);
        if (e.state.userRole) {
          setUserRole(e.state.userRole);
        }
      }
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  // On app load — restore session from localStorage
  useEffect(() => {
    const role = getRole()
    const token = localStorage.getItem('token')
    if (role && token) {
      setUserRole(role)
      setPage(role)
      if (role === 'admin') {
        loadInterns();
      }
    } else {
      setPage('login');
      setUserRole(null);
    }
  }, [])

  const loadInterns = async () => {
    try {
      const allInterns = await apiFetch('/api/interns');
      
      const formatted = await Promise.all(allInterns.map(async (intern) => {
        let project = { title: '', description: '', gitRepoLink: '', liveProjectLink: '' };
        let tasks = [];
        try {
          const projData = await apiFetch(`/api/projects/intern/${intern.id}`);
          if (projData) {
            project = {
              title: projData.title || '',
              description: projData.description || '',
              gitRepoLink: projData.git_repo_link || '',
              liveProjectLink: projData.live_project_link || ''
            };
          }
          const tasksData = await apiFetch(`/api/tasks/intern/${intern.id}`);
          if (tasksData) {
            tasks = tasksData.reverse().map(t => ({
              id: t.id,
              title: t.title,
              description: t.description || '',
              dueDate: t.expected_date || '',
              submissionDate: t.submission_date || ''
            }));
          }
        } catch (err) {
          console.error(`Error loading details for intern ${intern.id}:`, err);
        }

        return {
          ...intern,
          collegeName: intern.college_name || '',
          startingDate: intern.starting_date || '',
          endingDate: intern.ending_date || '',
          photo: intern.photo_url || null,
          project,
          tasks
        };
      }));
      
      setInterns(formatted);
    } catch (err) {
      console.error('Fetch failed:', err.message);
      setInterns([]);
    }
  };

  const handleUpdateIntern = async (id, updatedFields) => {
    let photoUrl = updatedFields.photo;

    try {
      if (updatedFields.photoFile) {
        const formDataToSend = new FormData();
        formDataToSend.append('photo', updatedFields.photoFile);

        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const token = localStorage.getItem('token');
        const photoRes = await fetch(`${apiUrl}/api/interns/${id}/photo`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formDataToSend
        });
        const photoData = await photoRes.json();
        if (!photoRes.ok) throw new Error(photoData.error || 'Failed to upload photo');
        photoUrl = photoData.photoUrl;
      }

      const current = await apiFetch(`/api/interns/${id}`);
      
      const merged = {
        name: updatedFields.name !== undefined ? updatedFields.name : current.name,
        college_name: updatedFields.collegeName !== undefined ? updatedFields.collegeName : current.college_name,
        dept: updatedFields.dept !== undefined ? updatedFields.dept : current.dept,
        year: updatedFields.year !== undefined ? parseInt(updatedFields.year, 10) : current.year,
        sem: updatedFields.sem !== undefined ? parseInt(updatedFields.sem, 10) : current.sem,
        mail: updatedFields.mail !== undefined ? updatedFields.mail : current.mail,
        number: updatedFields.number !== undefined ? updatedFields.number : current.number,
        starting_date: updatedFields.startingDate !== undefined ? updatedFields.startingDate : current.starting_date,
        ending_date: updatedFields.endingDate !== undefined ? updatedFields.endingDate : current.ending_date,
        batch_number: updatedFields.batchNumber !== undefined ? updatedFields.batchNumber : current.batch_number,
        status: updatedFields.status !== undefined ? updatedFields.status : current.status,
        profile_visible: updatedFields.profileVisible !== undefined ? updatedFields.profileVisible : current.profile_visible,
        photo_url: photoUrl !== undefined ? photoUrl : current.photo_url
      };

      await apiFetch(`/api/interns/${id}`, {
        method: 'PUT',
        body: JSON.stringify(merged)
      });
    } catch (err) {
      console.warn('Database save skipped, updating local memory state:', err.message);
    }

    setInterns(prev => prev.map(intern => {
      if (intern.id === id) {
        const updated = { 
          ...intern, 
          ...updatedFields,
          photo: photoUrl !== undefined ? photoUrl : intern.photo
        };
        delete updated.photoFile;
        if (selectedIntern && selectedIntern.id === id) {
          setSelectedIntern(updated);
        }
        return updated;
      }
      return intern;
    }));
  };

  const handleAssignProject = async (id, projectData) => {
    try {
      await apiFetch('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          intern_id: id,
          title: projectData.title,
          description: projectData.description,
          git_repo_link: projectData.gitRepoLink,
          live_project_link: projectData.liveProjectLink
        })
      });
    } catch (err) {
      console.warn('Database project upsert skipped, updating local memory state:', err.message);
    }

    setInterns(prev => prev.map(intern => {
      if (intern.id === id) {
        const updated = {
          ...intern,
          project: { ...intern.project, ...projectData }
        };
        if (selectedIntern && selectedIntern.id === id) {
          setSelectedIntern(updated);
        }
        return updated;
      }
      return intern;
    }));
  };

  const handleAddTask = async (id, task) => {
    let savedTask = {
      ...task,
      id: `task-${id}-${Date.now()}`
    };

    try {
      const res = await apiFetch('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          intern_id: id,
          title: task.title,
          expected_date: task.dueDate,
          upcoming_task: false
        })
      });
      savedTask = {
        id: res.id,
        title: res.title,
        description: res.description || '',
        dueDate: res.expected_date || '',
        submissionDate: res.submission_date || ''
      };
    } catch (err) {
      console.warn('Database task insertion skipped, updating local memory state:', err.message);
    }

    setInterns(prev => prev.map(intern => {
      if (intern.id === id) {
        const updated = {
          ...intern,
          tasks: [...intern.tasks, savedTask]
        };
        if (selectedIntern && selectedIntern.id === id) {
          setSelectedIntern(updated);
        }
        return updated;
      }
      return intern;
    }));
  };

  const handleEditTask = async (internId, taskId, updatedTask) => {
    try {
      await apiFetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: updatedTask.status || 'not_started',
          submission_date: updatedTask.submissionDate || null,
          title: updatedTask.title,
          expected_date: updatedTask.dueDate
        })
      });
    } catch (err) {
      console.warn('Database task update skipped, updating local memory state:', err.message);
    }

    setInterns(prev => prev.map(intern => {
      if (intern.id === internId) {
        const updated = {
          ...intern,
          tasks: intern.tasks.map(task => task.id === taskId ? { ...task, ...updatedTask } : task)
        };
        if (selectedIntern && selectedIntern.id === internId) {
          setSelectedIntern(updated);
        }
        return updated;
      }
      return intern;
    }));
  };

  const handleDeleteTask = async (internId, taskId) => {
    try {
      await apiFetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn('Database task delete skipped, updating local memory state:', err.message);
    }

    setInterns(prev => prev.map(intern => {
      if (intern.id === internId) {
        const updated = {
          ...intern,
          tasks: intern.tasks.filter(task => task.id !== taskId)
        };
        if (selectedIntern && selectedIntern.id === internId) {
          setSelectedIntern(updated);
        }
        return updated;
      }
      return intern;
    }));
  };

  const handleLogin = async (email, password) => {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    localStorage.setItem('token', data.token);
    localStorage.setItem('role', data.role);
    localStorage.setItem('intern_id', data.intern_id);
    setUserRole(data.role);
    setPage(data.role);
    if (data.role === 'admin') {
      await loadInterns();
    }
    return data;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('intern_id');
    setUserRole(null);
    setPage('login');
  };

  const handleTogglePage = () => {
    if (page === 'admin' || page === 'intern') {
      handleLogout();
    } else if (page === 'login') {
      setCurrentStep(1);
      setSubmitted(false);
      setFormData({
        name: '',
        collegeName: '',
        dept: '',
        year: '',
        sem: '',
        mail: '',
        number: '',
        photo: null,
        startingDate: '',
        endingDate: '',
        batchNumber: '',
        registrationKey: '',
        password: '',
        confirmPassword: ''
      });
      setPage('register');
    } else {
      setPage('login');
    }
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {(page === 'login' || page === 'register') && (
        <Header mode={page} onActionClick={handleTogglePage} />
      )}
      
      {page === 'admin' ? (
        <AdminLayout onLogout={handleLogout} />
      ) : page === 'intern' ? (
        <InternLayout onLogout={handleLogout} />
      ) : page === 'login' ? (
        <Login onLogin={handleLogin} onRegisterClick={handleTogglePage} />
      ) : (
        <Register 
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          formData={formData}
          setFormData={setFormData}
          submitted={submitted}
          setSubmitted={setSubmitted}
          onBackToLogin={handleTogglePage}
        />
      )}
    </div>
  );
}

export default App;