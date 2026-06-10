import { useState, useEffect } from 'react';
import ApprovedInterns from './ApprovedInterns';
import PendingApprovals from './PendingApprovals';
import { getAllInterns, approveIntern, rejectIntern } from '../../services/internService';
import './AdminLayout.css';

const AdminLayout = ({ onLogout }) => {
  const [pendingInterns, setPendingInterns] = useState([]);
  const [activePage, setActivePage] = useState('dashboard'); // 'dashboard' | 'pending'

  useEffect(() => {
    if (!window.history.state || window.history.state.activePage !== activePage) {
      window.history.pushState({ ...window.history.state, activePage }, '');
    }
  }, [activePage]);

  useEffect(() => {
    const handlePop = (e) => {
      if (e.state && e.state.activePage) {
        setActivePage(e.state.activePage);
      }
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  // Fetch pending list on mount and periodically if needed
  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    try {
      const allInterns = await getAllInterns();
      const pending = allInterns.filter((i) => i.status === 'pending');
      setPendingInterns(pending || []);
    } catch (err) {
      console.error('Error fetching pending registrations:', err.message);
    }
  };

  const handleApprove = async (id) => {
    try {
      const intern = pendingInterns.find((i) => i.id === id);
      if (!intern) return;
      await approveIntern(id);
      setPendingInterns((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      alert(`Approval failed: ${err.message}`);
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectIntern(id);
      setPendingInterns((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      alert(`Rejection failed: ${err.message}`);
    }
  };

  const activeTabStyle = {
    background: 'rgba(255, 255, 255, 0.2)',
    color: '#fff',
    borderRadius: '8px',
    padding: '7px 16px',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    border: 'none',
    cursor: 'pointer',
    outline: 'none'
  };

  const inactiveTabStyle = {
    background: 'transparent',
    color: 'rgba(255, 255, 255, 0.7)',
    borderRadius: '8px',
    padding: '7px 16px',
    fontSize: '14px',
    fontWeight: 500,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    border: 'none',
    cursor: 'pointer',
    outline: 'none',
    transition: 'background 0.2s, color 0.2s'
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Top Header Bar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        height: '56px',
        background: '#3D35C4',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
        boxSizing: 'border-box'
      }}>
        {/* Left side — Navigation tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setActivePage('dashboard')}
            style={activePage === 'dashboard' ? activeTabStyle : inactiveTabStyle}
            onMouseEnter={(e) => {
              if (activePage !== 'dashboard') {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = '#fff';
              }
            }}
            onMouseLeave={(e) => {
              if (activePage !== 'dashboard') {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
              }
            }}
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => setActivePage('pending')}
            style={activePage === 'pending' ? activeTabStyle : inactiveTabStyle}
            onMouseEnter={(e) => {
              if (activePage !== 'pending') {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = '#fff';
              }
            }}
            onMouseLeave={(e) => {
              if (activePage !== 'pending') {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
              }
            }}
          >
            Pending Approvals
          </button>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Bell icon */}
          <div
            onClick={() => setActivePage('pending')}
            style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            title="Pending Approvals"
          >
            <i className="ti ti-bell" style={{ fontSize: '22px', color: '#fff' }} />
            {pendingInterns.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '-4px',
                right: '-6px',
                background: '#FF4444',
                color: '#fff',
                fontSize: '10px',
                fontWeight: 700,
                minWidth: '18px',
                height: '18px',
                borderRadius: '9px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}>
                {pendingInterns.length}
              </div>
            )}
          </div>

          {/* Admin Panel label */}
          <span style={{
            color: '#fff',
            borderRadius: '8px',
            padding: '7px 14px',
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            display: 'inline-block'
          }}>
            Admin Panel
          </span>

          {/* Logout button */}
          <button
            type="button"
            onClick={onLogout}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              borderRadius: '8px',
              padding: '7px 14px',
              fontSize: '13px',
              fontWeight: 600,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              border: '1px solid rgba(255, 255, 255, 0.3)',
              cursor: 'pointer',
              outline: 'none',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{
        marginTop: '56px',
        height: 'calc(100vh - 56px)',
        overflowY: 'auto',
        width: '100vw',
        boxSizing: 'border-box',
        padding: '24px',
        background: 'radial-gradient(circle at 15% 20%, rgba(232, 230, 248, 0.6) 0%, transparent 35%), radial-gradient(circle at 85% 80%, rgba(253, 246, 236, 0.6) 0%, transparent 35%), #FFFFFF',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {activePage === 'dashboard' && <ApprovedInterns />}
        {activePage === 'pending' && (
          <PendingApprovals
            pendingInterns={pendingInterns}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}
      </div>
    </div>
  );
};

export default AdminLayout;
