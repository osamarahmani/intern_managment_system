import React, { useState } from 'react';
import Stepper from '../components/registration/Stepper';
import PersonalDetails from '../components/registration/steps/PersonalDetails';
import ContactDetails from '../components/registration/steps/ContactDetails';
import ProgramDetails from '../components/registration/steps/ProgramDetails';
import ReviewSubmit from '../components/registration/steps/ReviewSubmit';
import SuccessScreen from '../components/registration/SuccessScreen';
import { supabase } from '../supabase/client';

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
      // 1. Verify that entered Batch Number and Registration Key are active in Supabase
      const { data: batchData, error: batchError } = await supabase
        .from('batches')
        .select('*')
        .eq('batch_number', formData.batchNumber?.trim())
        .eq('registration_key', formData.registrationKey?.trim())
        .eq('is_active', true)
        .maybeSingle();

      if (batchError) throw batchError;

      if (!batchData) {
        throw new Error('Registration failed: Invalid or inactive Batch Number and Registration Key.');
      }

      // Step 1 — create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.mail,
        password: formData.password
      });
      if (authError) throw authError;

      // Step 2 — wait for session to be established
      const { data: { session } } = await supabase.auth.getSession();

      // Upload profile photo if provided
      let uploadedPhotoUrl = null;
      if (formData.photo) {
        console.log('formData.photo type:', typeof formData.photo);
        console.log('formData.photo instanceof File:', formData.photo instanceof File);
        console.log('formData.photo value:', formData.photo);
        try {
          const { uploadPhoto } = await import('../services/internService');
          uploadedPhotoUrl = await uploadPhoto(formData.photo, authData.user.id);
        } catch (uploadErr) {
          console.error('Upload failed:', uploadErr);
          alert('Photo upload failed: ' + (uploadErr.message || uploadErr));
          throw uploadErr;
        }
      }

      // Step 3 — insert intern record with photo_url populated
      const { data: internData, error: internError } = await supabase
        .from('interns')
        .insert({
          name: formData.name,
          college_name: formData.collegeName,
          dept: formData.dept,
          year: formData.year,
          sem: formData.sem,
          mail: formData.mail,
          number: formData.number,
          starting_date: formData.startingDate || new Date().toISOString().split('T')[0],
          ending_date: formData.endingDate || new Date().toISOString().split('T')[0],
          photo_url: uploadedPhotoUrl,
          status: 'pending',
          batch_number: formData.batchNumber
        })
        .select()
        .single();
      if (internError) throw internError;

      // Step 4 — upsert profile record linking auth user to intern
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          role: 'intern',
          intern_id: internData.id
        });
      if (profileError) throw profileError;

      // Automatically sign out because registration is pending admin approval
      await supabase.auth.signOut();

      // 5. Successful! Set submitted true to show success page
      setSubmitted(true);
    } catch (err) {
      setErrorMsg(err.message || 'An unexpected error occurred during registration.');
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
