import React, { useState } from 'react';
import AuthCard from '../components/AuthCard';

const Login = () => {
  const [activeRole, setActiveRole] = useState('admin');

  return (
    <main style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 20px', boxSizing: 'border-box' }}>
      <h1 className="visually-hidden">Gateway Portal Access Control</h1>
      <AuthCard activeRole={activeRole} setActiveRole={setActiveRole} />
    </main>
  );
};

export default Login;
