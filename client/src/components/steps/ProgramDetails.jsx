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

    if (Object.keys(errors).length > 0) {
      setLocalErrors(errors);
    } else {
      onNext();
    }
  };

  return (
    <form className="auth-form" noValidate>
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
