import React from 'react';
import logo from '../assets/tarcin-logo.webp';
import './Header.css';

const Header = ({ mode = 'login', onActionClick }) => {
  const isLogin = mode === 'login';

  return (
    <header className="gateway-header" role="banner">
      <div className="header-container">
        {/* Left Side: Logo */}
        <div className="logo-container">
          <a href="/" aria-label="Tarcin Home">
            <img 
              src={logo} 
              alt="Tarcin Logo" 
              className="brand-logo" 
            />
          </a>
        </div>

        {/* Right Side: Dynamic Toggle Link Prompt */}
        <div className="nav-actions">
          <div className="register-prompt">
            <span className="prompt-text">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
            </span>
            <button 
              type="button" 
              className="register-link"
              onClick={onActionClick}
              aria-label={isLogin ? "Register a new account" : "Go to login page"}
            >
              {isLogin ? "Register" : "Login"}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
