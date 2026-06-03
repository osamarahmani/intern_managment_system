import React from 'react';

const InternProfile = ({ internData }) => {
  if (!internData) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateStr).toLocaleDateString(undefined, options);
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="profile-card-container">
      {/* Left Column - Badge */}
      <div className="profile-card-left">
        {internData.photo_url ? (
          <img 
            src={internData.photo_url} 
            alt={`${internData.name}'s Profile`} 
            className="profile-avatar-img"
          />
        ) : (
          <div className="profile-avatar-placeholder">
            <i className="ti ti-user" aria-hidden="true" />
          </div>
        )}
        <h2 className="profile-name">{internData.name || 'N/A'}</h2>
        <p className="profile-dept">{internData.dept || 'N/A'}</p>
        <span className="profile-badge">INTERN</span>
      </div>

      {/* Right Column - Details */}
      <div className="profile-card-right">
        <div className="profile-row">
          <span className="profile-label">College Name</span>
          <span className="profile-value">{internData.college_name || 'N/A'}</span>
        </div>

        <div className="profile-row">
          <span className="profile-label">Department</span>
          <span className="profile-value">{internData.dept || 'N/A'}</span>
        </div>

        <div className="profile-row">
          <span className="profile-label">Year</span>
          <span className="profile-value">{internData.year || 'N/A'}</span>
        </div>

        <div className="profile-row">
          <span className="profile-label">Semester</span>
          <span className="profile-value">{internData.sem || 'N/A'}</span>
        </div>

        <div className="profile-row">
          <span className="profile-label">Email Address</span>
          <span className="profile-value">{internData.mail || 'N/A'}</span>
        </div>

        <div className="profile-row">
          <span className="profile-label">Phone Number</span>
          <span className="profile-value">{internData.number || 'N/A'}</span>
        </div>

        <div className="profile-row">
          <span className="profile-label">Starting Date</span>
          <span className="profile-value">{formatDate(internData.starting_date)}</span>
        </div>

        <div className="profile-row">
          <span className="profile-label">Ending Date</span>
          <span className="profile-value">{formatDate(internData.ending_date)}</span>
        </div>
      </div>
    </div>
  );
};

export default InternProfile;
