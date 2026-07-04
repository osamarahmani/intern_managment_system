import './Header.css';

const Header = ({ mode = 'login', onActionClick }) => {
  return (
    <header className="gateway-header" role="banner">
      <div className="header-container">

        {/* Right Side: Dynamic Toggle Link Prompt */}
        <div className="nav-actions">
          {mode === 'admin' && (
            <div className="admin-header-badge-container">
              <span className="admin-badge">Admin Panel</span>
              <button 
                type="button" 
                className="logout-link"
                onClick={onActionClick}
                aria-label="Logout and return to login page"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;