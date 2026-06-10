import { useState } from 'react';

const ProgramDetails = ({ formData, onUpdate, onNext, onBack }) => {
  const [localErrors, setLocalErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const updateFormData = onUpdate;

  const handleFieldChange = (field, value) => {
    onUpdate({ [field]: value });
    if (localErrors[field]) {
      setLocalErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleNext = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const errors = {};

    if (!formData.startingDate) {
      errors.startingDate = 'Start date is required.';
    }

    if (!formData.endingDate) {
      errors.endingDate = 'End date is required.';
    } else if (formData.startingDate && new Date(formData.endingDate) < new Date(formData.startingDate)) {
      errors.endingDate = 'End date cannot be before start date';
    }

    if (!formData.batchNumber?.trim()) {
      errors.batchNumber = 'Batch Number is required.';
    }

    if (!formData.registrationKey?.trim()) {
      errors.registrationKey = 'Registration Key is required.';
    }

    if (Object.keys(errors).length > 0) {
      setLocalErrors(errors);
      if (!formData.password || formData.password.length < 6) {
        setPasswordError('Password must be at least 6 characters.');
      } else if (formData.password !== formData.confirmPassword) {
        setPasswordError('Passwords do not match.');
      } else {
        setPasswordError('');
      }
      return;
    }

    setLocalErrors({});

    if (!formData.password || formData.password.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setPasswordError('');
    onNext();
  };


  return (
    <form className="auth-form" noValidate>
      {/* Dates Row */}
      <div className="grid-2-col">
        {/* Starting Date Field (Left Column) */}
        <div className="input-group">
          <label htmlFor="reg-startingDate" className="form-label">
            Starting Date <span className="required-asterisk">*</span>
          </label>
          <input
            type="date"
            id="reg-startingDate"
            className={`form-input date-input ${localErrors.startingDate ? 'input-error' : ''}`}
            value={formData.startingDate}
            onChange={(e) => handleFieldChange('startingDate', e.target.value)}
            required
          />
          {localErrors.startingDate && (
            <span className="error-message" role="alert">
              {localErrors.startingDate}
            </span>
          )}
        </div>

        {/* Ending Date Field (Right Column) */}
        <div className="input-group">
          <label htmlFor="reg-endingDate" className="form-label">
            Ending Date <span className="required-asterisk">*</span>
          </label>
          <input
            type="date"
            id="reg-endingDate"
            className={`form-input date-input ${localErrors.endingDate ? 'input-error' : ''}`}
            value={formData.endingDate}
            onChange={(e) => handleFieldChange('endingDate', e.target.value)}
            required
          />
          {localErrors.endingDate && (
            <span className="error-message" role="alert">
              {localErrors.endingDate}
            </span>
          )}
        </div>
      </div>

      {/* Batch and Key Row */}
      <div className="grid-2-col" style={{ marginTop: '16px' }}>
        {/* Batch Number */}
        <div className="input-group">
          <label htmlFor="reg-batchNumber" className="form-label">
            Batch Number <span className="required-asterisk">*</span>
          </label>
          <input
            type="text"
            id="reg-batchNumber"
            placeholder="BATCH NUMBER"
            className={`form-input ${localErrors.batchNumber ? 'input-error' : ''}`}
            value={formData.batchNumber || ''}
            onChange={(e) => handleFieldChange('batchNumber', e.target.value)}
            required
          />
          {localErrors.batchNumber && (
            <span className="error-message" role="alert">
              {localErrors.batchNumber}
            </span>
          )}
        </div>

        {/* Registration Key */}
        <div className="input-group">
          <label htmlFor="reg-registrationKey" className="form-label">
            Registration Key <span className="required-asterisk">*</span>
          </label>
          <input
            type="text"
            id="reg-registrationKey"
            placeholder="REGISTRATION KEY"
            className={`form-input ${localErrors.registrationKey ? 'input-error' : ''}`}
            value={formData.registrationKey || ''}
            onChange={(e) => handleFieldChange('registrationKey', e.target.value)}
            required
          />
          {localErrors.registrationKey && (
            <span className="error-message" role="alert">
              {localErrors.registrationKey}
            </span>
          )}
        </div>
      </div>

      {/* Password Row */}
      <div className="grid-2-col" style={{ marginTop: '16px', marginBottom: '20px' }}>
        {/* Create Password */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: '500', color: '#212121' }}>
            Create Password <span style={{ color: '#B00020' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Min. 6 characters"
              value={formData.password || ''}
              onChange={(e) => updateFormData({ password: e.target.value })}
              required
              style={{
                width: '100%',
                height: '44px',
                padding: '0 44px 0 14px',
                border: '1px solid #E0E0E0',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box',
                outline: 'none'
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(prev => !prev)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#9E9E9E',
                fontSize: '16px',
                padding: 0
              }}
            >
              <i className={showPassword ? 'ti ti-eye-off' : 'ti ti-eye'} />
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: '500', color: '#212121' }}>
            Confirm Password <span style={{ color: '#B00020' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Re-enter your password"
              value={formData.confirmPassword || ''}
              onChange={(e) => {
                updateFormData({ confirmPassword: e.target.value })
                setPasswordError('')
              }}
              required
              style={{
                width: '100%',
                height: '44px',
                padding: '0 44px 0 14px',
                border: `1px solid ${passwordError ? '#B00020' : '#E0E0E0'}`,
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box',
                outline: 'none'
              }}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(prev => !prev)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#9E9E9E',
                fontSize: '16px',
                padding: 0
              }}
            >
              <i className={showConfirmPassword ? 'ti ti-eye-off' : 'ti ti-eye'} />
            </button>
          </div>
          {/* Error message */}
          {passwordError && (
            <span style={{ fontSize: '12px', color: '#B00020' }}>
              {passwordError}
            </span>
          )}
          {/* Match success message */}
          {formData.confirmPassword && !passwordError && formData.password === formData.confirmPassword && (
            <span style={{ fontSize: '12px', color: '#2E7D32' }}>
              ✓ Passwords match
            </span>
          )}
        </div>
      </div>

      {/* Footer Navigation Buttons */}
      <div className="step-footer-nav double-btn-nav">
        <button
          type="button"
          className="ghost-submit-btn reg-back-btn"
          onClick={onBack}
          aria-label="Return to Contact Details step"
        >
          Back
        </button>
        <button
          type="button"
          className="primary-submit-btn reg-next-btn"
          onClick={handleNext}
          aria-label="Proceed to Review and Submit step"
        >
          Next
        </button>
      </div>
    </form>
  );
};

export default ProgramDetails;
