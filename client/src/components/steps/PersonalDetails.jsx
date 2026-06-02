import React, { useState } from 'react';

const PersonalDetails = ({ formData, onUpdate, onNext }) => {
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

    if (!formData.name.trim()) errors.name = 'Name is required.';
    if (!formData.collegeName.trim()) errors.collegeName = 'College Name is required.';
    if (!formData.dept.trim()) errors.dept = 'Department is required.';
    if (!formData.year) errors.year = 'Please select your Year.';
    if (!formData.sem) errors.sem = 'Please select your Semester.';

    if (Object.keys(errors).length > 0) {
      setLocalErrors(errors);
    } else {
      onNext();
    }
  };

  return (
    <form className="auth-form" noValidate>
      <div className="grid-2-col">
        {/* Name (Left Column) */}
        <div className="input-group">
          <label htmlFor="reg-name" className="form-label">
            Name <span className="required-asterisk">*</span>
          </label>
          <input
            type="text"
            id="reg-name"
            placeholder="Enter Name"
            className={`form-input ${localErrors.name ? 'input-error' : ''}`}
            value={formData.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            required
            autoComplete="name"
          />
          {localErrors.name && (
            <span className="error-message" role="alert">
              {localErrors.name}
            </span>
          )}
        </div>

        {/* College Name (Right Column) */}
        <div className="input-group">
          <label htmlFor="reg-collegeName" className="form-label">
            College Name <span className="required-asterisk">*</span>
          </label>
          <input
            type="text"
            id="reg-collegeName"
            placeholder="Enter College Name"
            className={`form-input ${localErrors.collegeName ? 'input-error' : ''}`}
            value={formData.collegeName}
            onChange={(e) => handleFieldChange('collegeName', e.target.value)}
            required
          />
          {localErrors.collegeName && (
            <span className="error-message" role="alert">
              {localErrors.collegeName}
            </span>
          )}
        </div>

        {/* Dept (Left Column) */}
        <div className="input-group">
          <label htmlFor="reg-dept" className="form-label">
            Department <span className="required-asterisk">*</span>
          </label>
          <input
            type="text"
            id="reg-dept"
            placeholder="Enter Department"
            className={`form-input ${localErrors.dept ? 'input-error' : ''}`}
            value={formData.dept}
            onChange={(e) => handleFieldChange('dept', e.target.value)}
            required
          />
          {localErrors.dept && (
            <span className="error-message" role="alert">
              {localErrors.dept}
            </span>
          )}
        </div>

        {/* Year (Right Column - Dropdown) */}
        <div className="input-group">
          <label htmlFor="reg-year" className="form-label">
            Year <span className="required-asterisk">*</span>
          </label>
          <div className="dropdown-wrapper">
            <select
              id="reg-year"
              className={`form-input dropdown-select ${localErrors.year ? 'input-error' : ''}`}
              value={formData.year}
              onChange={(e) => handleFieldChange('year', e.target.value)}
              required
            >
              <option value="">Select</option>
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
              <option value="3rd Year">3rd Year</option>
              <option value="4th Year">4th Year</option>
            </select>
            <i className="ti ti-chevron-down dropdown-arrow-icon" aria-hidden="true"></i>
          </div>
          {localErrors.year && (
            <span className="error-message" role="alert">
              {localErrors.year}
            </span>
          )}
        </div>
      </div>

      {/* Sem (Full width centered - Dropdown) */}
      <div className="input-group sem-full-width">
        <label htmlFor="reg-sem" className="form-label">
          Semester <span className="required-asterisk">*</span>
        </label>
        <div className="dropdown-wrapper">
          <select
            id="reg-sem"
            className={`form-input dropdown-select ${localErrors.sem ? 'input-error' : ''}`}
            value={formData.sem}
            onChange={(e) => handleFieldChange('sem', e.target.value)}
            required
          >
            <option value="">Select</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
            <option value="6">6</option>
            <option value="7">7</option>
            <option value="8">8</option>
          </select>
          <i className="ti ti-chevron-down dropdown-arrow-icon" aria-hidden="true"></i>
        </div>
        {localErrors.sem && (
          <span className="error-message" role="alert">
            {localErrors.sem}
          </span>
        )}
      </div>

      {/* Footer Navigation Buttons */}
      <div className="step-footer-nav single-btn-nav">
        <button
          type="button"
          className="primary-submit-btn reg-next-btn"
          onClick={handleNextClick}
          aria-label="Proceed to Contact Details step"
        >
          Next
        </button>
      </div>
    </form>
  );
};

export default PersonalDetails;
