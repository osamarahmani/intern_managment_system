import React from 'react';

const SuccessScreen = () => {
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
      <p className="success-subtext">You will receive a confirmation on your email</p>
    </div>
  );
};

export default SuccessScreen;
