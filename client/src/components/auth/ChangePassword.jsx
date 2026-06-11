import { useState } from 'react'
import { changePassword } from '../../services/authService'

const ChangePassword = ({ token, onPasswordChanged }) => {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!newPassword || !confirmPassword) {
      setError('Both fields are required.')
      return
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      await changePassword(newPassword, token)
      onPasswordChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 20px', boxSizing: 'border-box' }}>
      <div style={{ width: '420px', maxWidth: '100%', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 24px rgba(61,53,196,0.10)', padding: '36px 32px', boxSizing: 'border-box' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#3D35C4', marginBottom: '8px' }}>Set New Password</h2>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>
          You must set a new password before continuing.
        </p>
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
          <div style={{ marginBottom: '24px' }}>
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
            style={{ width: '100%', padding: '11px', background: '#3D35C4', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Saving...' : 'Set Password & Continue'}
          </button>
        </form>
      </div>
    </main>
  )
}

export default ChangePassword
