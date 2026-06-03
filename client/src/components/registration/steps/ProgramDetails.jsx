import React, { useState } from 'react';

const ProgramDetails = ({ formData, onUpdate, onNext, onBack }) => {
  const [localErrors, setLocalErrors] = useState({});

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

  const handleNextClick = (e) => {
    e.preventDefault();
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

    if (!formData.password) {
      errors.password = 'Password is required.';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }

    if (Object.keys(errors).length > 0) {
      setLocalErrors(errors);
    } else {
      onNext();
    }
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
            placeholder="e.g. BATCH-24-SUMMER"
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
            placeholder="e.g. key_902"
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
      <div className="input-group" style={{ marginTop: '16px', marginBottom: '20px' }}>
        <label htmlFor="reg-password" className="form-label">
          Password <span className="required-asterisk">*</span>
        </label>
        <input
          type="password"
          id="reg-password"
          placeholder="Set Login Password (Min. 6 chars)"
          className={`form-input ${localErrors.password ? 'input-error' : ''}`}
          value={formData.password || ''}
          onChange={(e) => handleFieldChange('password', e.target.value)}
          required
        />
        {localErrors.password && (
          <span className="error-message" role="alert">
            {localErrors.password}
          </span>
        )}
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
          onClick={handleNextClick}
          aria-label="Proceed to Review and Submit step"
        >
          Next
        </button>
      </div>
    </form>
  );
};

export default ProgramDetails;
