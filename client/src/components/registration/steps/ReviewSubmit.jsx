import { useState } from 'react';
import { formatDate } from '../../../utils/formatDate';
import InternAvatar from '../../InternAvatar';
import LoadingSpinner from '../../LoadingSpinner';

const ReviewSubmit = ({ formData, onBack, onSubmit }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      await onSubmit();
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="review-step-wrapper">
      {isLoading && <LoadingSpinner message="Submitting your registration..." />}
      <div className="intern-id-card">
        {/* Left Column (30% Width - Purple ID Badge Header) */}
        <div className="id-card-left">
          <div className="id-card-avatar-container">
            {formData.photo instanceof File ? (
              <img
                src={URL.createObjectURL(formData.photo)}
                alt="Preview"
                className="id-card-avatar"
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  objectFit: 'cover'
                }}
              />
            ) : (
              <InternAvatar
                name={formData.name}
                size={100}
                photoBust={formData._photoBust || ''}
              />
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

          {/* Row: Batch Number */}
          <div className="id-card-row">
            <span className="id-card-label">Batch Number</span>
            <span className="id-card-value">{formData.batchNumber || 'N/A'}</span>
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
          disabled={isLoading}
          style={{ opacity: isLoading ? 0.7 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}
        >
          Back
        </button>
        <button
          type="button"
          className="primary-submit-btn reg-register-btn"
          onClick={handleSubmit}
          aria-label="Complete registration and submit application"
          disabled={isLoading}
          style={{ opacity: isLoading ? 0.7 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}
        >
          {isLoading ? 'Submitting...' : 'Register'}
        </button>
      </div>
    </div>
  );
};

export default ReviewSubmit;
