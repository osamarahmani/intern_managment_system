import logo from '../../assets/tarcin-logo.webp';

const Sidebar = ({ activePage, setActivePage, pendingCount, onLogout }) => {
  return (
    <aside className="admin-sidebar" role="navigation" aria-label="Admin Navigation Sidebar">
      {/* Sidebar Logo */}

      {/* Navigation Items */}
      <nav className="sidebar-nav">
        <button
          type="button"
          className={`sidebar-link ${activePage === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActivePage('dashboard')}
          aria-current={activePage === 'dashboard' ? 'page' : undefined}
        >
          <div className="sidebar-link-content">
            <i className="ti ti-layout-dashboard" aria-hidden="true" />
            <span>Dashboard</span>
          </div>
        </button>

        <button
          type="button"
          className={`sidebar-link ${activePage === 'approvals' ? 'active' : ''}`}
          onClick={() => setActivePage('approvals')}
          aria-current={activePage === 'approvals' ? 'page' : undefined}
        >
          <div className="sidebar-link-content">
            <i className="ti ti-clock" aria-hidden="true" />
            <span>Pending Approvals</span>
          </div>
          {pendingCount > 0 && (
            <span className="sidebar-badge" aria-label={`${pendingCount} pending registrations`}>
              {pendingCount}
            </span>
          )}
        </button>
      </nav>

      {/* Sidebar Footer / Logout */}
      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-logout-btn"
          onClick={onLogout}
          aria-label="Logout from admin panel"
        >
          <i className="ti ti-logout" aria-hidden="true" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
