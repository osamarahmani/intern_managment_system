import React, { useState, useRef } from 'react';

const ContactDetails = ({ formData, onUpdate, onNext, onBack }) => {
  const [localErrors, setLocalErrors] = useState({});
  const [photoError, setPhotoError] = useState('');
  const fileInputRef = useRef(null);

  const [photoPreview, setPhotoPreview] = useState(() => {
    if (formData.photo) {
      if (typeof formData.photo === 'string') {
        return formData.photo;
      }
      return URL.createObjectURL(formData.photo);
    }
    return '';
  });

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

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (5MB limit = 5,242,880 bytes)
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setPhotoError('File exceeds 5MB limit');
      onUpdate({ photo: null });
      setPhotoPreview('');
      return;
    }

    // Validate file type
    const acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!acceptedTypes.includes(file.type)) {
      setPhotoError('Please upload a valid JPG, PNG, or WEBP image.');
      onUpdate({ photo: null });
      setPhotoPreview('');
      return;
    }

    // Clear photo errors
    setPhotoError('');

    // Store actual File object in formData
    onUpdate({ photo: file });

    // Create preview URL separately just for display
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);
  };

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleNextClick = (e) => {
    e.preventDefault();
    const errors = {};

    // Email validation
    if (!formData.mail.trim()) {
      errors.mail = 'Email is required.';
    } else if (!/\S+@\S+\.\S+/.test(formData.mail)) {
      errors.mail = 'Please enter a valid email address.';
    }

    // Phone number validation (must be non-empty and look like a phone number)
    const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-s.]?[0-9]{3}[-s.]?[0-9]{4,6}$/;
    if (!formData.number.trim()) {
      errors.number = 'Phone number is required.';
    } else if (isNaN(formData.number.replace(/\D/g, '')) || formData.number.length < 8) {
      errors.number = 'Please enter a valid phone number.';
    }

    // Photo validation
    if (!formData.photo) {
      setPhotoError('Profile photo is required.');
      errors.photo = true;
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
        {/* Email Field (Left Column) */}
        <div className="input-group">
          <label htmlFor="reg-mail" className="form-label">
            Email <span className="required-asterisk">*</span>
          </label>
          <input
            type="email"
            id="reg-mail"
            placeholder="Enter Email"
            className={`form-input ${localErrors.mail ? 'input-error' : ''}`}
            value={formData.mail}
            onChange={(e) => handleFieldChange('mail', e.target.value)}
            required
            autoComplete="email"
          />
          {localErrors.mail && (
            <span className="error-message" role="alert">
              {localErrors.mail}
            </span>
          )}
        </div>

        {/* Number Field (Right Column) */}
        <div className="input-group">
          <label htmlFor="reg-number" className="form-label">
            Phone Number <span className="required-asterisk">*</span>
          </label>
          <input
            type="tel"
            id="reg-number"
            placeholder="Enter Phone Number"
            className={`form-input ${localErrors.number ? 'input-error' : ''}`}
            value={formData.number}
            onChange={(e) => handleFieldChange('number', e.target.value)}
            required
            autoComplete="tel"
          />
          {localErrors.number && (
            <span className="error-message" role="alert">
              {localErrors.number}
            </span>
          )}
        </div>
      </div>

      {/* Photo Upload (Full Width - Centered) */}
      <div className="input-group photo-upload-group">
        <label className="form-label centered-label">
          Profile Photo <span className="required-asterisk">*</span>
        </label>
        
        <input 
          type="file" 
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".jpg, .jpeg, .png, .webp"
          onChange={handlePhotoUpload}
        />

        <div className="photo-upload-container">
          {/* Avatar Preview (Rendered above hint text if file exists) */}
          {photoPreview && (
            <div className="avatar-preview-container">
              <img 
                src={photoPreview} 
                alt="Profile Avatar Preview" 
                className="avatar-preview-circle" 
              />
            </div>
          )}

          {/* Trigger Button */}
          <button
            type="button"
            className="photo-picker-btn"
            onClick={triggerFileSelect}
            aria-label="Upload profile photo from files"
          >
            {formData.photo ? 'Change Photo' : 'Upload Photo'}
          </button>

          {/* File constraints hint */}
          <p className="photo-picker-hint">
            JPG, PNG or WEBP &bull; Max 5MB
          </p>

          {/* Error Message logs */}
          {photoError && (
            <span className="error-message centered-error" role="alert">
              {photoError}
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
          aria-label="Return to Personal Details step"
        >
          Back
        </button>
        <button
          type="button"
          className="primary-submit-btn reg-next-btn"
          onClick={handleNextClick}
          aria-label="Proceed to Program Details step"
        >
          Next
        </button>
      </div>
    </form>
  );
};

export default ContactDetails;
