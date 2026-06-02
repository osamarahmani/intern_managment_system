import React from 'react';

const ReviewSubmit = ({ formData, onBack, onSubmit }) => {
  // Safe helper to format dates for display (e.g. YYYY-MM-DD to standard reading format)
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateStr).toLocaleDateString(undefined, options);
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="review-step-wrapper">
      {/* Intern ID Card Container */}
      <div className="intern-id-card">
        {/* Left Column (30% Width - Purple ID Badge Header) */}
        <div className="id-card-left">
          <div className="id-card-avatar-container">
            {formData.photo ? (
              <img 
                src={formData.photo} 
                alt={`${formData.name}'s Profile Photo`} 
                className="id-card-avatar"
              />
            ) : (
              <div className="id-card-avatar-placeholder">
                <i className="ti ti-user" aria-hidden="true"></i>
              </div>
            )}
          </div>
          <h3 className="id-card-name">{formData.name || 'Your Name'}</h3>
          <p className="id-card-dept">{formData.dept || 'Department'}</p>
          <div className="id-card-badge-footer">INTERN</div>
        </div>

        {/* Right Column (70% Width - Padded Information details) */}
        <div className="id-card-right">
          {/* Row: College Name */}
          <div className="id-card-row">
            <span className="id-card-label">College Name</span>
            <span className="id-card-value">{formData.collegeName || 'N/A'}</span>
          </div>

          {/* Row: Year & Sem side by side */}
          <div className="id-card-row-grid">
            <div className="id-card-row">
              <span className="id-card-label">Year</span>
              <span className="id-card-value">{formData.year || 'N/A'}</span>
            </div>
            <div className="id-card-row">
              <span className="id-card-label">Semester</span>
              <span className="id-card-value">{formData.sem || 'N/A'}</span>
            </div>
          </div>

          {/* Row: Contact Email */}
          <div className="id-card-row">
            <span className="id-card-label">Email Address</span>
            <span className="id-card-value">{formData.mail || 'N/A'}</span>
          </div>

          {/* Row: Phone Number */}
          <div className="id-card-row">
            <span className="id-card-label">Phone Number</span>
            <span className="id-card-value">{formData.number || 'N/A'}</span>
          </div>

          {/* Row: Duration starting and ending dates */}
          <div className="id-card-row-grid">
            <div className="id-card-row">
              <span className="id-card-label">Starting Date</span>
              <span className="id-card-value">{formatDate(formData.startingDate) || 'N/A'}</span>
            </div>
            <div className="id-card-row">
              <span className="id-card-label">Ending Date</span>
              <span className="id-card-value">{formatDate(formData.endingDate) || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Navigation Buttons */}
      <div className="step-footer-nav double-btn-nav review-nav-padding">
        <button
          type="button"
          className="ghost-submit-btn reg-back-btn"
          onClick={onBack}
          aria-label="Return to Program Details step"
        >
          Back
        </button>
        <button
          type="button"
          className="primary-submit-btn reg-register-btn"
          onClick={onSubmit}
          aria-label="Complete registration and submit application"
        >
          Register
        </button>
      </div>
    </div>
  );
};

export default ReviewSubmit;
