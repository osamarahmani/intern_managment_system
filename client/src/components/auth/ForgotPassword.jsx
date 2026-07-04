import { useState } from 'react'
import apiClient from '../../utils/apiClient'

const ForgotPassword = ({ onBack }) => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSuccess('')
    setError('')
    if (!email.trim()) {
      setError('Email is required.')
      return
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.')
      return
    }
    setLoading(true)
    try {
      await apiClient('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      })
      setSuccess('If this email is registered, a reset link has been sent to your inbox.')
      setEmail('')
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 20px', boxSizing: 'border-box' }}>
      <div style={{ width: '400px', maxWidth: '100%', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 24px rgba(61,53,196,0.10)', padding: '36px 32px', boxSizing: 'border-box' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#3D35C4', marginBottom: '8px' }}>Forgot Password</h2>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>
          Enter your email address to receive a password reset link.
        </p>
        {success && (
          <div style={{ background: '#E6F4EA', color: '#137333', padding: '10px 12px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px', fontWeight: '500' }}>
            {success}
          </div>
        )}
        {error && (
          <div style={{ background: '#FCE8E6', color: '#C5221F', padding: '10px 12px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px', fontWeight: '500' }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              Email <span style={{ color: '#B00020' }}>*</span>
            </label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError('') }}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #E0E0E0', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
              autoComplete="email"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '11px', background: '#3D35C4', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginBottom: '12px' }}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
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

export default ForgotPassword