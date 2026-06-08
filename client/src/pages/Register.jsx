import React, { useState } from 'react';
import Stepper from '../components/registration/Stepper';
import PersonalDetails from '../components/registration/steps/PersonalDetails';
import ContactDetails from '../components/registration/steps/ContactDetails';
import ProgramDetails from '../components/registration/steps/ProgramDetails';
import ReviewSubmit from '../components/registration/steps/ReviewSubmit';
import SuccessScreen from '../components/registration/SuccessScreen';
import { apiFetch } from '../services/api';

const Register = ({ 
  currentStep, 
  setCurrentStep, 
  formData, 
  setFormData, 
  submitted, 
  setSubmitted,
  onBackToLogin
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const updateFormData = (newData) => {
    setFormData((prev) => ({ ...prev, ...newData }));
  };

  const handleNextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBackStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleFormSubmit = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('college_name', formData.collegeName);
      formDataToSend.append('dept', formData.dept);
      formDataToSend.append('year', formData.year);
      formDataToSend.append('sem', formData.sem);
      formDataToSend.append('mail', formData.mail);
      formDataToSend.append('number', formData.number);
      formDataToSend.append('starting_date', formData.startingDate || new Date().toISOString().split('T')[0]);
      formDataToSend.append('ending_date', formData.endingDate || new Date().toISOString().split('T')[0]);
      formDataToSend.append('batch_number', formData.batchNumber);
      formDataToSend.append('registration_key', formData.registrationKey);
      formDataToSend.append('password', formData.password);

      if (formData.photo instanceof File) {
        formDataToSend.append('photo', formData.photo);
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/auth/register`, {
        method: 'POST',
        body: formDataToSend
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Registration failed');
      setSubmitted(true);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Render form contents dynamically based on active step
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <PersonalDetails 
            formData={formData} 
            onUpdate={updateFormData} 
            onNext={handleNextStep} 
          />
        );
      case 2:
        return (
          <ContactDetails 
            formData={formData} 
            onUpdate={updateFormData} 
            onNext={handleNextStep} 
            onBack={handleBackStep} 
          />
        );
      case 3:
        return (
          <ProgramDetails 
            formData={formData} 
            onUpdate={updateFormData} 
            onNext={handleNextStep} 
            onBack={handleBackStep} 
          />
        );
      case 4:
        return (
          <ReviewSubmit 
            formData={formData} 
            onBack={handleBackStep} 
            onSubmit={handleFormSubmit} 
          />
        );
      default:
        return null;
    }
  };

  return (
    <main className="register-page-container">
      {/* Dynamic Headings (Hidden after registration is completed successfully) */}
      {!submitted && (
        <div className="registration-header-group">
          <h2 className="registration-main-heading">Intern Registration</h2>
          <p className="registration-subheading">Complete all steps to register</p>
        </div>
      )}

      {/* Main Registration Form Card Wrapper */}
      <div className={`registration-card ${submitted ? 'success-card' : ''}`}>
        {submitted ? (
          <SuccessScreen onBackToLogin={onBackToLogin} />
        ) : (
          <>
            {/* Stepper Tabs progress header */}
            <Stepper currentStep={currentStep} />
            
            {/* Display Error Message Banner */}
            {errorMsg && (
              <div 
                style={{ 
                  background: '#FCE8E6', 
                  color: '#C5221F', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  fontSize: '13px', 
                  marginBottom: '20px', 
                  fontWeight: '500', 
                  lineHeight: '1.4' 
                }}
                role="alert"
              >
                {errorMsg}
              </div>
            )}

            {/* Display Loading Processing State Overlay/Banner */}
            {loading && (
              <div 
                style={{ 
                  background: 'rgba(61, 53, 196, 0.08)', 
                  color: '#2A259A', 
                  padding: '10px 12px', 
                  borderRadius: '8px', 
                  fontSize: '13px', 
                  marginBottom: '20px', 
                  fontWeight: '600', 
                  textAlign: 'center' 
                }}
              >
                Processing your registration securely... Please wait.
              </div>
            )}

            {/* Active form page panel content */}
            <div className="registration-form-content">
              {renderStepContent()}
            </div>
          </>
        )}
      </div>

      {/* Return to Login link helper at bottom */}
      {!submitted && (
        <button
          onClick={onBackToLogin}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#757575',
            fontSize: '13px',
            marginTop: '20px',
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
        >
          Return to Login
        </button>
      )}
    </main>
  );
};

export default Register;
