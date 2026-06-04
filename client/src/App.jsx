import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminLayout from './components/admin/AdminLayout';
import InternLayout from './components/intern/InternLayout';
import { mockInterns } from './mockData';
import * as authService from './services/authService';
import * as internService from './services/internService';
import * as projectService from './services/projectService';
import * as taskService from './services/taskService';

function App() {
  const [page, setPage] = useState('login'); // 'login' | 'register' | 'admin' | 'intern'
  
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
    password: ''
  });

  // Admin Dashboard States
  const [interns, setInterns] = useState([]);
  const [selectedIntern, setSelectedIntern] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('basicInfo');

  // Check active Supabase Session upon mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (user) {
          const profile = await authService.getUserRole(user.id);
          if (profile) {
            if (profile.role === 'admin') {
              setPage('admin');
              await loadInterns();
            } else if (profile.role === 'intern') {
              try {
                const status = await authService.getInternStatus(profile.intern_id);
                if (status === 'approved') {
                  setPage('intern');
                } else {
                  console.warn(`Session check: Intern status is ${status}. Logging out.`);
                  await authService.logout();
                  setPage('login');
                }
              } catch (statusErr) {
                console.error('Session check: Failed to check intern status. Logging out.', statusErr.message);
                await authService.logout();
                setPage('login');
              }
            }
          }
        }
      } catch (err) {
        console.log('Session check skipped or offline:', err.message);
        // Default load for offline/fallback environment
        await loadInterns();
      }
    };
    checkSession();
  }, []);

  const loadInterns = async () => {
    try {
      const data = await internService.getAllInterns();
      if (!data) throw new Error('No data received from Supabase');
      
      const formatted = data.map(intern => ({
        ...intern,
        collegeName: intern.college_name || '',
        startingDate: intern.starting_date || '',
        endingDate: intern.ending_date || '',
        photo: intern.photo_url || null,
        project: intern.projects?.[0] || { title: '', description: '', gitRepoLink: '', liveProjectLink: '' },
        tasks: intern.tasks || []
      }));
      setInterns(formatted);
    } catch (err) {
      console.warn('Supabase fetch failed, falling back to local mock dataset:', err.message);
      setInterns(mockInterns);
    }
  };

  const handleUpdateIntern = async (id, updatedFields) => {
    let photoUrl = updatedFields.photo;
    
    // Upload base64 photos to storage bucket
    if (updatedFields.photo && updatedFields.photo.startsWith('data:')) {
      try {
        photoUrl = await internService.uploadPhoto(updatedFields.photo, id);
      } catch (err) {
        console.error('Storage photo upload failed:', err);
      }
    }

    const dbUpdates = {};
    if (updatedFields.name !== undefined) dbUpdates.name = updatedFields.name;
    if (updatedFields.collegeName !== undefined) dbUpdates.college_name = updatedFields.collegeName;
    if (updatedFields.dept !== undefined) dbUpdates.dept = updatedFields.dept;
    if (updatedFields.year !== undefined) dbUpdates.year = updatedFields.year;
    if (updatedFields.sem !== undefined) dbUpdates.sem = updatedFields.sem;
    if (updatedFields.mail !== undefined) dbUpdates.mail = updatedFields.mail;
    if (updatedFields.number !== undefined) dbUpdates.number = updatedFields.number;
    if (updatedFields.startingDate !== undefined) dbUpdates.starting_date = updatedFields.startingDate;
    if (updatedFields.endingDate !== undefined) dbUpdates.ending_date = updatedFields.endingDate;
    if (photoUrl !== undefined) dbUpdates.photo_url = photoUrl;

    try {
      await internService.updateIntern(id, dbUpdates);
    } catch (err) {
      console.warn('Database save skipped, updating local memory state:', err.message);
    }

    setInterns(prev => prev.map(intern => {
      if (intern.id === id) {
        const updated = { ...intern, ...updatedFields };
        if (photoUrl !== undefined) updated.photo = photoUrl;
        if (selectedIntern && selectedIntern.id === id) {
          setSelectedIntern(updated);
        }
        return updated;
      }
      return intern;
    }));
  };

  const handleAssignProject = async (id, projectData) => {
    const dbProject = {
      title: projectData.title,
      description: projectData.description,
      git_repo_link: projectData.gitRepoLink,
      live_project_link: projectData.liveProjectLink
    };

    try {
      await projectService.assignProject(id, dbProject);
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
    const dbTask = {
      title: task.title,
      description: task.description,
      due_date: task.dueDate,
      submission_date: task.submissionDate || null
    };

    let savedTask = {
      ...task,
      id: `task-${id}-${Date.now()}`
    };

    try {
      const res = await taskService.addTask(id, dbTask);
      savedTask = {
        id: res.id,
        title: res.title,
        description: res.description,
        dueDate: res.due_date,
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
    const dbUpdates = {
      title: updatedTask.title,
      description: updatedTask.description,
      due_date: updatedTask.dueDate,
      submission_date: updatedTask.submissionDate || null
    };

    try {
      await taskService.editTask(taskId, dbUpdates);
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
      await taskService.deleteTask(taskId);
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

  const handleTogglePage = async () => {
    if (page === 'admin' || page === 'intern') {
      try {
        await authService.logout();
      } catch (err) {
        console.log('Logout skip:', err.message);
      }
      setPage('login');
    } else if (page === 'login') {
      // Clear out and reset registration state when entering Register view
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
        password: ''
      });
      setPage('register');
    } else {
      setPage('login');
    }
  };

  const handleLoginSuccess = async (role, email) => {
    if (role === 'admin') {
      setPage('admin');
      await loadInterns();
    } else if (role === 'intern') {
      setPage('intern');
    } else {
      alert(`Logging in as: ${email}`);
    }
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Global Header (Only show on login and register views) */}
      {(page === 'login' || page === 'register') && (
        <Header mode={page} onActionClick={handleTogglePage} />
      )}
      
      {/* Conditionally Render Pages */}
      {page === 'admin' ? (
        <AdminLayout onLogout={handleTogglePage} />
      ) : page === 'intern' ? (
        <InternLayout onLogout={handleTogglePage} />
      ) : page === 'login' ? (
        <Login onLogin={handleLoginSuccess} onRegisterClick={handleTogglePage} />
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