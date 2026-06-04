import React from 'react';
import logo from '../../assets/tarcin-logo.webp';

const InternSidebar = ({ activePage, setActivePage, onLogout }) => {
  return (
    <aside className="intern-sidebar" role="navigation" aria-label="Intern Navigation Sidebar">
      
      {/* Navigation Items */}
      <nav className="intern-sidebar-nav">
        <button
          type="button"
          className={`intern-sidebar-link ${activePage === 'profile' ? 'active' : ''}`}
          onClick={() => setActivePage('profile')}
          aria-current={activePage === 'profile' ? 'page' : undefined}
        >
          <div className="intern-sidebar-link-content">
            <i className="ti ti-user" aria-hidden="true" />
            <span>My Profile</span>
          </div>
        </button>

        <button
          type="button"
          className={`intern-sidebar-link ${activePage === 'project' ? 'active' : ''}`}
          onClick={() => setActivePage('project')}
          aria-current={activePage === 'project' ? 'page' : undefined}
        >
          <div className="intern-sidebar-link-content">
            <i className="ti ti-folder" aria-hidden="true" />
            <span>My Project</span>
          </div>
        </button>

        <button
          type="button"
          className={`intern-sidebar-link ${activePage === 'tasks' ? 'active' : ''}`}
          onClick={() => setActivePage('tasks')}
          aria-current={activePage === 'tasks' ? 'page' : undefined}
        >
          <div className="intern-sidebar-link-content">
            <i className="ti ti-checklist" aria-hidden="true" />
            <span>My Tasks</span>
          </div>
        </button>

        <button
          type="button"
          className={`intern-sidebar-link ${activePage === 'directory' ? 'active' : ''}`}
          onClick={() => setActivePage('directory')}
          aria-current={activePage === 'directory' ? 'page' : undefined}
        >
          <div className="intern-sidebar-link-content">
            <i className="ti ti-users" aria-hidden="true" />
            <span>Teammates Profile</span>
          </div>
        </button>
      </nav>

      {/* Sidebar Footer / Logout */}
      <div className="intern-sidebar-footer">
        <button
          type="button"
          className="intern-sidebar-logout-btn"
          onClick={onLogout}
          aria-label="Logout from intern portal"
        >
          <i className="ti ti-logout" aria-hidden="true" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default InternSidebar;
