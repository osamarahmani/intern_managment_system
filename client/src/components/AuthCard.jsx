import React from 'react';
import LoginForm from './LoginForm';
import OverlayPanel from './OverlayPanel';
import './AuthCard.css';

const AuthCard = ({ activeRole, setActiveRole }) => {
  const handleToggle = () => {
    setActiveRole((prev) => (prev === 'admin' ? 'intern' : 'admin'));
  };

  return (
    <div className="auth-card-wrapper">
      {/* Mobile Tab Toggle Bar (visible only < 600px) */}
      <div className="mobile-tabs-container" role="tablist" aria-label="Role selector tabs">
        <button
          type="button"
          className={`mobile-tab-btn ${activeRole === 'admin' ? 'active' : ''}`}
          onClick={() => setActiveRole('admin')}
          role="tab"
          aria-selected={activeRole === 'admin'}
          aria-controls="admin-login-panel"
          id="admin-tab"
        >
          Admin Portal
        </button>
        <button
          type="button"
          className={`mobile-tab-btn ${activeRole === 'intern' ? 'active' : ''}`}
          onClick={() => setActiveRole('intern')}
          role="tab"
          aria-selected={activeRole === 'intern'}
          aria-controls="intern-login-panel"
          id="intern-tab"
        >
          Intern Portal
        </button>
        <div 
          className="mobile-tab-indicator" 
          style={{
            left: activeRole === 'admin' ? '4px' : 'calc(50% + 2px)',
          }}
          aria-hidden="true"
        ></div>
      </div>

      {/* Main Double Form Card Body */}
      <div className="auth-card-body">
        {/* Left Half: Admin Form */}
        <div 
          id="admin-login-panel"
          className={`form-panel-container admin-panel ${activeRole === 'admin' ? 'panel-active' : 'panel-inactive'}`}
          role="tabpanel"
          aria-labelledby="admin-tab"
        >
          <LoginForm role="admin" isActive={activeRole === 'admin'} />
        </div>

        {/* Right Half: Intern Form */}
        <div 
          id="intern-login-panel"
          className={`form-panel-container intern-panel ${activeRole === 'intern' ? 'panel-active' : 'panel-inactive'}`}
          role="tabpanel"
          aria-labelledby="intern-tab"
        >
          <LoginForm role="intern" isActive={activeRole === 'intern'} />
        </div>

        {/* Overlay Panel (slides horizontally on top of forms, hidden on mobile) */}
        <OverlayPanel activeRole={activeRole} onToggleRole={handleToggle} />
      </div>
    </div>
  );
};

export default AuthCard;
