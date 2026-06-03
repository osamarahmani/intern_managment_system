import React, { useState } from 'react';
import AuthCard from '../components/auth/AuthCard';

const Login = ({ onLogin, onRegisterClick }) => {
  const [activeRole, setActiveRole] = useState('admin');

  return (
    <main style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 20px', boxSizing: 'border-box' }}>
      <h1 className="visually-hidden">Gateway Portal Access Control</h1>
      <AuthCard activeRole={activeRole} setActiveRole={setActiveRole} onLogin={onLogin} onRegisterClick={onRegisterClick} />
    </main>
  );
};

export default Login;
