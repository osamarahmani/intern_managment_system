import React, { useState, useEffect } from 'react';

const BasicInfoSection = ({ intern, onSave }) => {
  const [formData, setFormData] = useState({
    name: intern.name || '',
    collegeName: intern.collegeName || '',
    dept: intern.dept || '',
    year: intern.year || '',
    sem: intern.sem || '',
    mail: intern.mail || '',
    number: intern.number || '',
    startingDate: intern.startingDate || '',
    endingDate: intern.endingDate || ''
  });

  const [localErrors, setLocalErrors] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);

  // Sync state if intern changes
  useEffect(() => {
    setFormData({
      name: intern.name || '',
      collegeName: intern.collegeName || '',
      dept: intern.dept || '',
      year: intern.year || '',
      sem: intern.sem || '',
      mail: intern.mail || '',
      number: intern.number || '',
      startingDate: intern.startingDate || '',
      endingDate: intern.endingDate || ''
    });
    setLocalErrors({});
    setShowSuccess(false);
  }, [intern]);

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (localErrors[field]) {
      setLocalErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const errors = {};

    if (!formData.name.trim()) errors.name = 'Name is required.';
    if (!formData.collegeName.trim()) errors.collegeName = 'College name is required.';
    if (!formData.dept.trim()) errors.dept = 'Department is required.';
    if (!formData.year) errors.year = 'Year is required.';
    if (!formData.sem) errors.sem = 'Semester is required.';
    
    if (!formData.mail.trim()) {
      errors.mail = 'Email is required.';
    } else if (!/\S+@\S+\.\S+/.test(formData.mail)) {
      errors.mail = 'Please enter a valid email address.';
    }

    if (!formData.number.trim()) {
      errors.number = 'Phone number is required.';
    }

    if (!formData.startingDate) {
      errors.startingDate = 'Start date is required.';
    }

    if (!formData.endingDate) {
      errors.endingDate = 'End date is required.';
    } else if (formData.startingDate && new Date(formData.endingDate) < new Date(formData.startingDate)) {
      errors.endingDate = 'End date cannot be before starting date.';
    }

    if (Object.keys(errors).length > 0) {
      setLocalErrors(errors);
      return;
    }

    // Save changes
    onSave(formData);
    
    // Trigger Success Notification (duration: 2s)
    setShowSuccess(true);
    const timer = setTimeout(() => {
      setShowSuccess(false);
    }, 2000);
    return () => clearTimeout(timer);
  };

  return (
    <form className="section-form" onSubmit={handleFormSubmit} noValidate id="basic-info-panel" role="tabpanel" aria-labelledby="basic-info-tab">
      <div className="basic-info-grid">
        {/* Name */}
        <div className="input-group">
          <label className="form-label" htmlFor="edit-name">
            Name <span className="required-asterisk">*</span>
          </label>
          <input
            type="text"
            id="edit-name"
            className={`form-input ${localErrors.name ? 'input-error' : ''}`}
            value={formData.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            required
          />
          {localErrors.name && <span className="error-message" role="alert">{localErrors.name}</span>}
        </div>

        {/* College Name */}
        <div className="input-group">
          <label className="form-label" htmlFor="edit-collegeName">
            College Name <span className="required-asterisk">*</span>
          </label>
          <input
            type="text"
            id="edit-collegeName"
            className={`form-input ${localErrors.collegeName ? 'input-error' : ''}`}
            value={formData.collegeName}
            onChange={(e) => handleFieldChange('collegeName', e.target.value)}
            required
          />
          {localErrors.collegeName && <span className="error-message" role="alert">{localErrors.collegeName}</span>}
        </div>

        {/* Dept */}
        <div className="input-group">
          <label className="form-label" htmlFor="edit-dept">
            Dept <span className="required-asterisk">*</span>
          </label>
          <input
            type="text"
            id="edit-dept"
            className={`form-input ${localErrors.dept ? 'input-error' : ''}`}
            value={formData.dept}
            onChange={(e) => handleFieldChange('dept', e.target.value)}
            required
          />
          {localErrors.dept && <span className="error-message" role="alert">{localErrors.dept}</span>}
        </div>

        {/* Year Dropdown */}
        <div className="input-group">
          <label className="form-label" htmlFor="edit-year">
            Year <span className="required-asterisk">*</span>
          </label>
          <div className="dropdown-wrapper">
            <select
              id="edit-year"
              className={`form-input dropdown-select ${localErrors.year ? 'input-error' : ''}`}
              value={formData.year}
              onChange={(e) => handleFieldChange('year', e.target.value)}
              required
            >
              <option value="" disabled>Select Year</option>
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
              <option value="3rd Year">3rd Year</option>
              <option value="4th Year">4th Year</option>
            </select>
            <i className="ti ti-chevron-down dropdown-arrow-icon" aria-hidden="true" />
          </div>
          {localErrors.year && <span className="error-message" role="alert">{localErrors.year}</span>}
        </div>

        {/* Sem Dropdown */}
        <div className="input-group">
          <label className="form-label" htmlFor="edit-sem">
            Sem <span className="required-asterisk">*</span>
          </label>
          <div className="dropdown-wrapper">
            <select
              id="edit-sem"
              className={`form-input dropdown-select ${localErrors.sem ? 'input-error' : ''}`}
              value={formData.sem}
              onChange={(e) => handleFieldChange('sem', e.target.value)}
              required
            >
              <option value="" disabled>Select Semester</option>
              {['1', '2', '3', '4', '5', '6', '7', '8'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <i className="ti ti-chevron-down dropdown-arrow-icon" aria-hidden="true" />
          </div>
          {localErrors.sem && <span className="error-message" role="alert">{localErrors.sem}</span>}
        </div>

        {/* Mail */}
        <div className="input-group">
          <label className="form-label" htmlFor="edit-mail">
            Mail <span className="required-asterisk">*</span>
          </label>
          <input
            type="email"
            id="edit-mail"
            className={`form-input ${localErrors.mail ? 'input-error' : ''}`}
            value={formData.mail}
            onChange={(e) => handleFieldChange('mail', e.target.value)}
            required
          />
          {localErrors.mail && <span className="error-message" role="alert">{localErrors.mail}</span>}
        </div>

        {/* Number */}
        <div className="input-group">
          <label className="form-label" htmlFor="edit-number">
            Number <span className="required-asterisk">*</span>
          </label>
          <input
            type="tel"
            id="edit-number"
            className={`form-input ${localErrors.number ? 'input-error' : ''}`}
            value={formData.number}
            onChange={(e) => handleFieldChange('number', e.target.value)}
            required
          />
          {localErrors.number && <span className="error-message" role="alert">{localErrors.number}</span>}
        </div>

        {/* Starting Date */}
        <div className="input-group">
          <label className="form-label" htmlFor="edit-startingDate">
            Starting Date <span className="required-asterisk">*</span>
          </label>
          <input
            type="date"
            id="edit-startingDate"
            className={`form-input date-input ${localErrors.startingDate ? 'input-error' : ''}`}
            value={formData.startingDate}
            onChange={(e) => handleFieldChange('startingDate', e.target.value)}
            required
          />
          {localErrors.startingDate && <span className="error-message" role="alert">{localErrors.startingDate}</span>}
        </div>

        {/* Ending Date */}
        <div className="input-group">
          <label className="form-label" htmlFor="edit-endingDate">
            Ending Date <span className="required-asterisk">*</span>
          </label>
          <input
            type="date"
            id="edit-endingDate"
            className={`form-input date-input ${localErrors.endingDate ? 'input-error' : ''}`}
            value={formData.endingDate}
            onChange={(e) => handleFieldChange('endingDate', e.target.value)}
            required
          />
          {localErrors.endingDate && <span className="error-message" role="alert">{localErrors.endingDate}</span>}
        </div>
      </div>

      {/* Footer Container */}
      <div className="section-footer">
        {showSuccess && (
          <span className="inline-success-msg" role="status" aria-live="polite">
            <i className="ti ti-circle-check" aria-hidden="true" />
            Changes saved
          </span>
        )}
        <button
          type="submit"
          className="basic-info-save-btn"
          aria-label="Save changes to basic info"
        >
          Save Changes
        </button>
      </div>
    </form>
  );
};

export default BasicInfoSection;
