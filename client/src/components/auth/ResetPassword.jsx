import { useState } from 'react'
import apiClient from '../../utils/apiClient'

const ResetPassword = ({ token, onBack }) => {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!newPassword || !confirmPassword) {
      setError('Both fields are required.')
      return
    }
    if (newPassword.length < 12) {
      setError('Password must be at least 12 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      await apiClient('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword })
      })
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Invalid or expired reset link.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <main style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 20px' }}>
        <div style={{ width: '400px', maxWidth: '100%', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 24px rgba(61,53,196,0.10)', padding: '36px 32px', textAlign: 'center' }}>
          <p style={{ color: '#B00020', fontWeight: '600', marginBottom: '16px' }}>Invalid reset link. Please request a new one.</p>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#3D35C4', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline', fontWeight: '600' }}>Back to Login</button>
        </div>
      </main>
    )
  }

  if (success) {
    return (
      <main style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 20px' }}>
        <div style={{ width: '400px', maxWidth: '100%', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 24px rgba(61,53,196,0.10)', padding: '36px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>✓</div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#3D35C4', marginBottom: '8px' }}>Password Reset Successfully</h2>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>You can now login with your new password.</p>
          <button onClick={onBack} style={{ background: '#3D35C4', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Go to Login</button>
        </div>
      </main>
    )
  }

  return (
    <main style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 20px', boxSizing: 'border-box' }}>
      <div style={{ width: '400px', maxWidth: '100%', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 24px rgba(61,53,196,0.10)', padding: '36px 32px', boxSizing: 'border-box' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#3D35C4', marginBottom: '8px' }}>Reset Password</h2>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>Enter your new password below.</p>
        {error && (
          <div style={{ background: '#FCE8E6', color: '#C5221F', padding: '10px 12px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px', fontWeight: '500' }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              New Password <span style={{ color: '#B00020' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNew ? 'text' : 'password'}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{ width: '100%', padding: '10px 40px 10px 12px', borderRadius: '8px', border: '1.5px solid #E0E0E0', fontSize: '14px', boxSizing: 'border-box' }}
              />
              <button type="button" onClick={() => setShowNew(p => !p)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '13px' }}>
                {showNew ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              Confirm Password <span style={{ color: '#B00020' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ width: '100%', padding: '10px 40px 10px 12px', borderRadius: '8px', border: '1.5px solid #E0E0E0', fontSize: '14px', boxSizing: 'border-box' }}
              />
              <button type="button" onClick={() => setShowConfirm(p => !p)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '13px' }}>
                {showConfirm ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '11px', background: '#3D35C4', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginBottom: '12px' }}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
          <button
            type="button"
            onClick={onBack}
            style={{ background: 'none', border: 'none', color: '#3D35C4', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline', fontWeight: '600', display: 'block', margin: '0 auto' }}
          >
            Back to Login
          </button>
        </form>
      </div>
    </main>
  )
}

export default ResetPassword
