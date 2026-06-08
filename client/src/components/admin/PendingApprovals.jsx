import { useState } from 'react';
import { formatDate } from '../../utils/formatDate';
import PendingModal from './PendingModal';
import InternAvatar from '../InternAvatar';

const PendingApprovals = ({ pendingInterns = [], onApprove, onReject }) => {
  const [selectedIntern, setSelectedIntern] = useState(null);

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
    <div style={{
      width: '100%',
      flex: 1,
      background: '#FFFFFF',
      borderRadius: '12px',
      border: '1px solid #E0E0E0',
      padding: '32px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      alignItems: pendingCount === 0 ? 'center' : 'stretch',
      justifyContent: pendingCount === 0 ? 'center' : 'flex-start'
    }}>
      {/* Headings */}
      {pendingCount > 0 && (
        <div className="pending-header-container" style={{ width: '100%', marginBottom: '24px' }}>
          <h2 className="pending-title">Pending Approvals</h2>
          <p className="pending-subheading">
            {pendingCount === 1 
              ? '1 registration awaiting review' 
              : `${pendingCount} registrations awaiting review`}
          </p>
        </div>
      )}

      {/* Empty State */}
      {pendingCount === 0 ? (
        <>
          <i className="ti ti-circle-check empty-state-icon" aria-hidden="true" style={{ fontSize: '48px', color: '#03DAC6' }} />
          <h3 className="empty-state-title" style={{ fontSize: '18px', marginTop: '16px', fontWeight: '600' }}>All caught up!</h3>
          <p className="empty-state-subtitle" style={{ color: '#9E9E9E', fontSize: '14px', marginTop: '6px' }}>No pending registrations at the moment</p>
        </>
      ) : (
        /* Pending Intern Card Grid */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '20px',
          width: '100%'
        }} role="list">
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
                <InternAvatar
                  photoUrl={intern.photo_url || intern.photo}
                  name={intern.name}
                  size={48}
                  style={{
                    border: '2px solid #FFE0B2',
                    backgroundColor: '#FAFAFA'
                  }}
                />
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
