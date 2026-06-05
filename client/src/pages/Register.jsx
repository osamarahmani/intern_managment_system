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
      // Convert photo to base64 if exists
      let photoBase64 = null;
      let photoMimeType = null;
      if (formData.photo instanceof File) {
        photoMimeType = formData.photo.type;
        photoBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(formData.photo);
        });
      }

      await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name,
          college_name: formData.collegeName,
          dept: formData.dept,
          year: parseInt(formData.year, 10),
          sem: parseInt(formData.sem, 10),
          mail: formData.mail,
          number: formData.number,
          starting_date: formData.startingDate || new Date().toISOString().split('T')[0],
          ending_date: formData.endingDate || new Date().toISOString().split('T')[0],
          batch_number: formData.batchNumber,
          registration_key: formData.registrationKey,
          password: formData.password,
          photo: photoBase64,
          photo_mime_type: photoMimeType
        })
      });
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
