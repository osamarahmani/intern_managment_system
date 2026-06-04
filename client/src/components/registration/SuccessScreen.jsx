import React from 'react';

const SuccessScreen = ({ onBackToLogin }) => {
  return (
    <div className="success-screen-wrapper" aria-live="polite">
      {/* Icon Badge */}
      <div className="success-checkmark-container">
        <svg 
          className="success-checkmark-svg" 
          viewBox="0 0 52 52" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle 
            className="success-checkmark-circle" 
            cx="26" 
            cy="26" 
            r="25" 
            fill="none" 
          />
          <path 
            className="success-checkmark-check" 
            fill="none" 
            d="M14.1 27.2l7.1 7.2 16.7-16.8" 
          />
        </svg>
      </div>

      {/* Message Heading */}
      <h2 className="success-heading">Registration Successful!</h2>
      {/* Subtext */}
      <p className="success-subtext" style={{ marginBottom: '24px' }}>
        Your registration is pending review. Please login after you are approved by the admin.
      </p>

      {/* Go to Login Button */}
      <button
        onClick={onBackToLogin}
        style={{
          height: '40px',
          background: '#3D35C4',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '8px',
          fontWeight: '600',
          fontSize: '14px',
          padding: '0 24px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(61, 53, 196, 0.2)',
          transition: 'background-color 0.2s'
        }}
      >
        Go to Login
      </button>
    </div>
  );
};

export default SuccessScreen;
