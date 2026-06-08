import { useState } from 'react';
import { formatDate } from '../../utils/formatDate';
import InternAvatar from '../InternAvatar';

const PendingModal = ({ intern, onClose, onApprove, onReject }) => {
  const [showConfirmReject, setShowConfirmReject] = useState(false);

  if (!intern) return null;

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
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

  return (
    <div className="pending-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="pending-modal-container">
        {/* Left Column (30%) - Purple Header Panel */}
        <div className="pending-modal-left">
          <InternAvatar
            internId={intern.id}
            name={intern.name}
            size={100}
            style={{
              border: '3px solid rgba(255, 255, 255, 0.25)',
              background: 'rgba(255, 255, 255, 0.1)',
              marginBottom: '16px'
            }}
          />
          
          <h3 id="modal-title" className="pending-modal-name">{intern.name}</h3>
          <p className="pending-modal-dept">{intern.dept || 'Computer Science'}</p>
          <span className="pending-modal-badge">Pending</span>
        </div>

        {/* Right Column (70%) - White Details Panel */}
        <div className="pending-modal-right">
          <div className="pending-modal-fields">
            <div className="pending-modal-row">
              <span className="pending-modal-label">College Name</span>
              <span className="pending-modal-value">{intern.college_name || intern.collegeName || 'N/A'}</span>
            </div>

            <div className="pending-modal-row">
              <span className="pending-modal-label">Department</span>
              <span className="pending-modal-value">{intern.dept || 'Computer Science'}</span>
            </div>

            <div className="pending-modal-row">
              <span className="pending-modal-label">Year</span>
              <span className="pending-modal-value">{intern.year || 'N/A'}</span>
            </div>

            <div className="pending-modal-row">
              <span className="pending-modal-label">Semester</span>
              <span className="pending-modal-value">{intern.sem || 'N/A'}</span>
            </div>

            <div className="pending-modal-row">
              <span className="pending-modal-label">Email Address</span>
              <span className="pending-modal-value">{intern.mail || 'N/A'}</span>
            </div>

            <div className="pending-modal-row">
              <span className="pending-modal-label">Phone Number</span>
              <span className="pending-modal-value">{intern.number || 'N/A'}</span>
            </div>

            <div className="pending-modal-row">
              <span className="pending-modal-label">Starting Date</span>
              <span className="pending-modal-value">{formatDate(intern.starting_date || intern.startingDate)}</span>
            </div>

            <div className="pending-modal-row">
              <span className="pending-modal-label">Ending Date</span>
              <span className="pending-modal-value">{formatDate(intern.ending_date || intern.endingDate)}</span>
            </div>

            <div className="pending-modal-row">
              <span className="pending-modal-label">Registered On</span>
              <span className="pending-modal-value">{formatDateTime(intern.created_at)}</span>
            </div>
          </div>

          {/* Modal Footer (Action Buttons & Alerts) */}
          <div className="pending-modal-footer">
            {/* Inline Confirmation Alert */}
            {showConfirmReject && (
              <div className="inline-confirmation-alert" role="alert">
                <span>Are you sure you want to reject this registration?</span>
                <div className="inline-conf-actions">
                  <button 
                    type="button" 
                    className="inline-conf-btn inline-conf-btn-yes"
                    onClick={() => {
                      onReject(intern.id);
                      onClose();
                    }}
                  >
                    Yes, Reject
                  </button>
                  <button 
                    type="button" 
                    className="inline-conf-btn inline-conf-btn-no"
                    onClick={() => setShowConfirmReject(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Default Footer Buttons */}
            <div className="pending-modal-actions">
              <button 
                type="button" 
                className="pending-btn-reject"
                onClick={() => setShowConfirmReject(true)}
                disabled={showConfirmReject}
              >
                Reject
              </button>
              
              <button 
                type="button" 
                className="pending-btn-approve"
                onClick={() => {
                  onApprove(intern.id);
                  onClose();
                }}
                disabled={showConfirmReject}
              >
                Approve
              </button>
              
              <button 
                type="button" 
                className="ghost-submit-btn" 
                style={{ height: '40px', width: '100px', fontSize: '13px' }}
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingModal;
