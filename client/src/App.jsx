import { useState, useEffect } from 'react';
import Header from './components/Header';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminLayout from './components/admin/AdminLayout';
import InternLayout from './components/intern/InternLayout';
import SuperAdminLayout from './components/superadmin/SuperAdminLayout';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';
import ChangePassword from './components/auth/ChangePassword';
import { login, logout, getToken, getRole } from './services/authService';

const consumeResetToken = () => {
  const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const query = new URLSearchParams(window.location.search)
  const token = fragment.get('reset-token') || query.get('token') || ''
  if (token) window.history.replaceState({}, '', window.location.pathname)
  return token
}

function App() {
  const [resetToken] = useState(consumeResetToken)
  const [page, setPage] = useState(() => resetToken ? 'resetPassword' : (getToken() && getRole()) || 'login');
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [pendingToken, setPendingToken] = useState(null);
  const [pendingRole, setPendingRole] = useState(null);
  
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



  const handleLogin = async (email, password) => {
    const data = await login(email, password)
    if (data.must_change_password) {
      sessionStorage.setItem('pendingToken', data.token)
      sessionStorage.setItem('pendingRole', data.role)
      setPendingToken(data.token)
      setPendingRole(data.role)
      setMustChangePassword(true)
      return data
    }
    setPage(data.role)
    return data
  }

  const handlePasswordChanged = () => {
    sessionStorage.removeItem('pendingToken')
    sessionStorage.removeItem('pendingRole')
    setMustChangePassword(false)
    setPage(pendingRole)
    setPendingToken(null)
    setPendingRole(null)
  }

  const handleLogout = async () => {
    await logout();
    setPage('login');
  };

  const handleTogglePage = () => {
    if (page === 'admin' || page === 'intern' || page === 'super_admin') {
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

  useEffect(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('intern_id')
  }, [])

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {(page === 'login' || page === 'register') && !mustChangePassword && (
        <Header mode={page} onActionClick={handleTogglePage} />
      )}
      
      {mustChangePassword ? (
        <ChangePassword token={pendingToken} onPasswordChanged={handlePasswordChanged} />
      ) : page === 'admin' ? (
        <AdminLayout onLogout={handleLogout} />
      ) : page === 'intern' ? (
        <InternLayout onLogout={handleLogout} />
      ) : page === 'super_admin' ? (
        <SuperAdminLayout onLogout={handleLogout} />
      ) : page === 'login' ? (
        <Login onLogin={handleLogin} onRegisterClick={handleTogglePage} onForgotPassword={() => setPage('forgotPassword')} />
      ) : page === 'forgotPassword' ? (
        <ForgotPassword onBack={() => setPage('login')} />
      ) : page === 'resetPassword' ? (
        <ResetPassword token={resetToken} onBack={() => setPage('login')} />
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
