import React from 'react';
import Stepper from '../components/Stepper';
import PersonalDetails from '../components/steps/PersonalDetails';
import ContactDetails from '../components/steps/ContactDetails';
import ProgramDetails from '../components/steps/ProgramDetails';
import ReviewSubmit from '../components/steps/ReviewSubmit';
import SuccessScreen from '../components/SuccessScreen';

const Register = ({ 
  currentStep, 
  setCurrentStep, 
  formData, 
  setFormData, 
  submitted, 
  setSubmitted 
}) => {
  
  const updateFormData = (newData) => {
    setFormData((prev) => ({ ...prev, ...newData }));
  };

  const handleNextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBackStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleFormSubmit = () => {
    setSubmitted(true);
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
          <SuccessScreen />
        ) : (
          <>
            {/* Stepper Tabs progress header */}
            <Stepper currentStep={currentStep} />
            
            {/* Active form page panel content */}
            <div className="registration-form-content">
              {renderStepContent()}
            </div>
          </>
        )}
      </div>
    </main>
  );
};

export default Register;
