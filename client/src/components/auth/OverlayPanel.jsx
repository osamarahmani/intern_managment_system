import React, { useState, useEffect } from 'react';

const OverlayPanel = ({ activeRole, onToggleRole }) => {
  // displayRole governs the visible text, which delays updating until the transition finishes.
  const [displayRole, setDisplayRole] = useState(activeRole);

  useEffect(() => {
    // If the user prefers reduced motion, update the content instantly instead of waiting
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setDisplayRole(activeRole);
    }
  }, [activeRole]);

  const handleTransitionEnd = (e) => {
    // Only trigger when the primary 'left' styling transition ends
    if (e.propertyName === 'left') {
      setDisplayRole(activeRole);
    }
  };

  // When activeRole is 'admin', the overlay is on the right, displaying intern-switching prompts.
  // When activeRole is 'intern', the overlay is on the left, displaying admin-switching prompts.
  const isRightSide = activeRole === 'admin';
  const showAdminInfo = displayRole === 'intern'; // If displayRole is 'intern', we show Intern info on overlay

  const headingText = showAdminInfo ? 'Welcome, Intern' : 'Hello, Admin?';
  const buttonText = showAdminInfo ? 'Admin Login' : 'Intern Login';

  return (
    <div 
      className={`overlay-panel-container ${isRightSide ? 'overlay-right' : 'overlay-left'}`}
      onTransitionEnd={handleTransitionEnd}
      aria-live="polite"
    >
      <div className="overlay-content">
        <h2 className="overlay-heading">{headingText}</h2>
        <button 
          type="button" 
          className="overlay-ghost-btn"
          onClick={onToggleRole}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
};

export default OverlayPanel;
