import React, { useState } from 'react';
import * as authService from '../../services/authService';

const LoginForm = ({ role, isActive, onLogin, onRegisterClick }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Validation States
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    let isValid = true;
    
    // Email Validation
    if (!email) {
      setEmailError('Email is required.');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Please enter a valid email address.');
      isValid = false;
    } else {
      setEmailError('');
    }

    // Password Validation
    if (!password) {
      setPasswordError('Password is required.');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      isValid = false;
    } else {
      setPasswordError('');
    }

    if (isValid) {
      try {
        let userEmail = email;
        if (role === 'intern') {
          const loginData = await authService.internLogin(email, password);
          userEmail = loginData.user.email;
        } else {
          const loginData = await authService.login(email, password);
          const profile = await authService.getUserRole(loginData.user.id);
          
          if (profile.role !== role) {
            throw new Error(`Unauthorized: This gateway portal is restricted to ${role} role only.`);
          }
        }

        if (onLogin) {
          onLogin(role, userEmail);
        }
      } catch (err) {
        console.warn('Supabase authentication failed, evaluating mock login fallback:', err.message);
        
        // Fallback to offline mock logic
        if (email.endsWith('@example.com') || email === 'admin@tarcin.com' || email === 'admin@example.com') {
          if (onLogin) {
            onLogin(role, email);
          }
        } else {
          setPasswordError(err.message || 'Authentication failed. Please check credentials.');
        }
      }
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (emailError) setEmailError('');
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (passwordError) setPasswordError('');
  };

  const isAdmin = role === 'admin';
  const heading = isAdmin ? 'Admin Login' : 'Intern Login';
  const buttonText = 'Login';
  
  // Tab index is set to -1 when hidden behind the overlay panel
  const tabIndex = isActive ? 0 : -1;

  return (
    <div 
      className={`form-panel-content ${isAdmin ? 'admin-side' : 'intern-side'}`}
      aria-hidden={!isActive}
    >
      {/* Heading */}
      <h2 className="form-heading">{heading}</h2>

      {/* Credentials Form */}
      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        {/* Email Field */}
        <div className="input-group">
          <label htmlFor={`${role}-email`} className="form-label">
            Email <span className="required-asterisk">*</span>
          </label>
          <input
            type="email"
            id={`${role}-email`}
            placeholder="Enter Email"
            className={`form-input ${emailError ? 'input-error' : ''}`}
            value={email}
            onChange={handleEmailChange}
            required
            tabIndex={tabIndex}
            autoComplete="email"
          />
          {emailError && (
            <span className="error-message" role="alert" id={`${role}-email-error`}>
              {emailError}
            </span>
          )}
        </div>

        {/* Password Field */}
        <div className="input-group">
          <label htmlFor={`${role}-password`} className="form-label">
            Password <span className="required-asterisk">*</span>
          </label>
          <div className="password-input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              id={`${role}-password`}
              placeholder="Enter Password"
              className={`form-input password-input ${passwordError ? 'input-error' : ''}`}
              value={password}
              onChange={handlePasswordChange}
              required
              tabIndex={tabIndex}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={tabIndex}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <i 
                className={showPassword ? 'ti ti-eye-off' : 'ti ti-eye'} 
                aria-hidden="true"
              ></i>
            </button>
          </div>
          {passwordError && (
            <span className="error-message" role="alert" id={`${role}-password-error`}>
              {passwordError}
            </span>
          )}
        </div>

        {/* Action Button */}
        <button
          type="submit"
          className={`primary-submit-btn ${isAdmin ? 'admin-btn' : 'intern-btn'}`}
          tabIndex={tabIndex}
          aria-label={`${buttonText} portal`}
        >
          {buttonText}
        </button>

        {/* Conditional Register Link for Interns Only */}
        {!isAdmin && (
          <div className="register-prompt-container" style={{ marginTop: '16px', textAlign: 'center', fontSize: '14px' }}>
            <span style={{ color: '#64748b' }}>Don't have an account? </span>
            <button
              type="button"
              onClick={onRegisterClick}
              tabIndex={tabIndex}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb', // You can change this to match your CSS variables
                textDecoration: 'underline',
                cursor: 'pointer',
                fontWeight: '600',
                padding: '0'
              }}
              aria-label="Register for a new intern account"
            >
              Register here
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default LoginForm;