import React, { useState } from 'react';

const LoginForm = ({ role, isActive }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Validation States
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleSubmit = (e) => {
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
      alert(`Logging in as ${role === 'admin' ? 'Admin' : 'Intern'} with ${email}`);
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
      </form>
    </div>
  );
};

export default LoginForm;
