import React, { useState } from 'react';
import Header from './components/Header';
import Login from './pages/Login';
import Register from './pages/Register';

function App() {
  const [page, setPage] = useState('login'); // 'login' | 'register'
  
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
    endingDate: ''
  });

  const handleTogglePage = () => {
    if (page === 'login') {
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
        endingDate: ''
      });
      setPage('register');
    } else {
      setPage('login');
    }
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Global Header */}
      <Header mode={page} onActionClick={handleTogglePage} />
      
      {/* Conditionally Render Pages */}
      {page === 'login' ? (
        <Login />
      ) : (
          <Register 
            currentStep={currentStep}
            setCurrentStep={setCurrentStep}
            formData={formData}
            setFormData={setFormData}
            submitted={submitted}
            setSubmitted={setSubmitted}
          />
      )}
    </div>
  );
}

export default App;