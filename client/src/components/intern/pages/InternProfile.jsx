import { useState, useEffect } from 'react'
import { formatDate } from '../../../utils/formatDate';
import InternAvatar from '../../InternAvatar';
import apiClient from '../../../utils/apiClient'
import { getToken } from '../../../services/authService'

const InternProfile = ({ internData }) => {
  const [feedback, setFeedback] = useState(null)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)

  useEffect(() => {
    if (!internData?.id) return
    apiClient(`/api/interns/${internData.id}/feedback`, {}, getToken())
      .then(f => setFeedback(f))
      .catch(() => {})
  }, [internData?.id])

  const calcCountdown = () => {
    if (!internData?.ending_date) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const end = new Date(internData.ending_date)
    end.setHours(0, 0, 0, 0)
    const diffMs = end - today
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays < 0) return { done: true, days: Math.abs(diffDays) }
    const weeks = Math.floor(diffDays / 7)
    const days = diffDays % 7
    return { done: false, weeks, days, totalDays: diffDays }
  }
  const countdown = calcCountdown()

  if (!internData) return null;

  return (
    <div className="profile-wrapper">
      {/* Left purple panel */}
      <div className="profile-sidebar">
        <InternAvatar
          internId={internData.id}
          name={internData.name}
          size={120}
          photoBust={internData._photoBust || ''}
          style={{ border: '3px solid rgba(255,255,255,0.3)' }}
        />
        <p style={{color:'#FFFFFF', fontSize:'18px', fontWeight:'500', marginTop:'16px', textAlign: 'center'}}>
          {internData.name}
        </p>
        <p style={{color:'rgba(255,255,255,0.75)', fontSize:'13px', textAlign: 'center'}}>
          {internData.dept}
        </p>
        <span style={{
          border: '1px solid rgba(255,255,255,0.5)', color: '#FFFFFF', fontSize: '11px',
          padding: '3px 12px', borderRadius: '4px', marginTop: '8px'
        }}>INTERN</span>

        {countdown && (
          <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.2)', width: '100%', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Internship Timeline
            </span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '10px' }}>
              <span style={{ fontSize: '20px' }}>🎓</span>
              <div style={{ textAlign: 'left' }}>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#03DAC6' }}>
                  {countdown.done ? 'Internship Completed' : 'Internship Active'}
                </p>
                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                  {countdown.done ? `Ended ${countdown.days} day${countdown.days !== 1 ? 's' : ''} ago` : `${countdown.totalDays} day${countdown.totalDays !== 1 ? 's' : ''} remaining`}
                </p>
              </div>
            </div>
          </div>
        )}

        {feedback && (
          <div style={{ marginTop: '20px', width: '100%', textAlign: 'center' }}>
            <button
              type="button" onClick={() => setShowFeedbackModal(true)}
              style={{ background: '#03DAC6', color: '#000', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', width: '100%' }}
            >⭐ View Feedback</button>
          </div>
        )}
      </div>

      {/* Right details */}
      <div className="profile-details-grid">
        {[
          ['College Name', internData.college_name || internData.collegeName],
          ['Department', internData.dept],
          ['Year', internData.year],
          ['Semester', internData.sem],
          ['Email Address', internData.mail],
          ['Phone Number', internData.number],
          ['Starting Date', formatDate(internData.starting_date)],
          ['Ending Date', formatDate(internData.ending_date)]
        ].map(([label, value], i) => (
          <div key={i} className="profile-grid-item">
            <p style={{ fontSize: '11px', color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{label}</p>
            <p style={{ fontSize: '14px', fontWeight: '500', color: '#212121' }}>{value || '—'}</p>
          </div>
        ))}
      </div>
      {/* Feedback Modal */}
      {showFeedbackModal && feedback && (
        <div
          onClick={() => setShowFeedbackModal(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px', boxSizing: 'border-box'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '32px',
              width: '100%',
              maxWidth: '420px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              textAlign: 'center',
              position: 'relative'
            }}
          >
            <button
              onClick={() => setShowFeedbackModal(false)}
              style={{
                position: 'absolute', top: '16px', right: '16px',
                background: 'none', border: 'none', fontSize: '22px',
                color: '#9E9E9E', cursor: 'pointer', lineHeight: 1
              }}
            >
              ×
            </button>

            <div style={{ fontSize: '36px', marginBottom: '8px' }}>⭐</div>
            <p style={{
              margin: '0 0 4px 0', fontSize: '11px', fontWeight: 700,
              color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: '0.5px'
            }}>
              Mentor Feedback
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', margin: '12px 0' }}>
              {[1, 2, 3, 4, 5].map(i => (
                <span key={i} style={{
                  fontSize: '22px',
                  color: i <= feedback.rating ? '#F9A825' : '#E0E0E0'
                }}>★</span>
              ))}
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#F9A825', marginLeft: '8px' }}>
                {feedback.rating}/5
              </span>
            </div>

            <p style={{
              margin: '16px 0 8px 0', fontSize: '15px', fontStyle: 'italic',
              color: '#212121', lineHeight: 1.6
            }}>
              "{feedback.feedback}"
            </p>
            {feedback.given_by_name && (
              <p style={{ margin: 0, fontSize: '13px', color: '#9E9E9E', fontWeight: 600 }}>
                — {feedback.given_by_name}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InternProfile;
