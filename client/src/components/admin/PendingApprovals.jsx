import { useState } from 'react';
import PendingModal from './PendingModal';

const PendingApprovals = ({ pendingInterns = [], onApprove, onReject }) => {
  const [selectedIntern, setSelectedIntern] = useState(null);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Get initials for placeholder avatar
  const getInitials = (name) => {
    if (!name) return 'I';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const pendingCount = pendingInterns.length;

  return (
    <div className="pending-approvals-wrapper">
      {/* Headings */}
      <div className="pending-header-container">
        <h2 className="pending-title">Pending Approvals</h2>
        <p className="pending-subheading">
          {pendingCount === 1 
            ? '1 registration awaiting review' 
            : `${pendingCount} registrations awaiting review`}
        </p>
      </div>

      {/* Empty State */}
      {pendingCount === 0 ? (
        <div className="empty-approvals-state" role="status">
          <i className="ti ti-circle-check empty-state-icon" aria-hidden="true" />
          <h3 className="empty-state-title">All caught up!</h3>
          <p className="empty-state-subtitle">No pending registrations at the moment</p>
        </div>
      ) : (
        /* Pending Intern Card Grid */
        <div className="pending-grid" role="list">
          {pendingInterns.map((intern) => (
            <div
              key={intern.id}
              className="pending-card"
              onClick={() => setSelectedIntern(intern)}
              role="listitem"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setSelectedIntern(intern);
                }
              }}
              title="Click to review registration"
            >
              {/* Card Header */}
              <div className="pending-card-header">
                {intern.photo_url || intern.photo ? (
                  <img 
                    src={intern.photo_url || intern.photo} 
                    alt={`${intern.name}'s Avatar`} 
                    className="pending-card-avatar"
                  />
                ) : (
                  <div className="pending-card-avatar-placeholder" aria-hidden="true">
                    {getInitials(intern.name)}
                  </div>
                )}
                <span className="pending-card-badge">Pending</span>
              </div>

              {/* Card Body */}
              <div className="pending-card-body">
                <h3 className="pending-card-name">{intern.name}</h3>
                <p className="pending-card-dept">{intern.dept || 'Computer Science'}</p>
                <p className="pending-card-college">{intern.college_name || intern.collegeName || 'N/A'}</p>
              </div>

              {/* Card Footer */}
              <div className="pending-card-footer">
                <span className="pending-card-date-label">Registered</span>
                <span className="pending-card-date-value">{formatDate(intern.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal Portal */}
      {selectedIntern && (
        <PendingModal
          intern={selectedIntern}
          onClose={() => setSelectedIntern(null)}
          onApprove={onApprove}
          onReject={onReject}
        />
      )}
    </div>
  );
};

export default PendingApprovals;
