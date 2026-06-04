import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import ApprovedInterns from './ApprovedInterns';
import PendingApprovals from './PendingApprovals';
import { getPendingInterns, approveIntern, rejectIntern } from '../../services/internService';
import './AdminLayout.css';

const AdminLayout = ({ onLogout }) => {
  const [pendingInterns, setPendingInterns] = useState([]);
  const [approvedInterns, setApprovedInterns] = useState([]);
  const [activePage, setActivePage] = useState('dashboard'); // 'dashboard' | 'approvals'
  const [loading, setLoading] = useState(false);

  // Fetch pending list on mount and periodically if needed
  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const data = await getPendingInterns();
      setPendingInterns(data || []);
    } catch (err) {
      console.error('Error fetching pending registrations:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await approveIntern(id);
      const approved = pendingInterns.find((i) => i.id === id);
      setPendingInterns((prev) => prev.filter((i) => i.id !== id));
      if (approved) {
        setApprovedInterns((prev) => [...prev, { ...approved, status: 'approved' }]);
      }
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

  const getPageTitle = () => {
    if (activePage === 'dashboard') return 'Dashboard';
    if (activePage === 'approvals') return 'Pending Approvals';
    return 'Admin';
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      width: '100vw',
      overflow: 'hidden'
    }}>
      {/* Sidebar — fixed width */}
      <div style={{
        width: '220px',
        flexShrink: 0,
        position: 'fixed',
        left: 0,
        top: 0,
        height: '100vh',
        background: '#3D35C4',
        zIndex: 100
      }}>
        <Sidebar
          activePage={activePage}
          setActivePage={setActivePage}
          pendingCount={pendingInterns.length}
          onLogout={onLogout}
        />
      </div>

      {/* Main content — takes ALL remaining width */}
      <div style={{
        marginLeft: '220px',
        flex: 1,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        width: 'calc(100vw - 220px)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          width: '100%',
          height: '64px',
          background: '#FFFFFF',
          borderBottom: '1px solid #EEEEEE',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          boxSizing: 'border-box',
          flexShrink: 0
        }}>
          <span style={{ fontSize: '18px', fontWeight: '500' }}>{getPageTitle()}</span>
          <span style={{
            background: '#3D35C4',
            color: '#fff',
            fontSize: '12px',
            padding: '4px 12px',
            borderRadius: '6px'
          }}>Admin Panel</span>
        </div>

        {/* Page content */}
        <div style={{
          flex: 1,
          padding: '24px 32px',
          boxSizing: 'border-box',
          width: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {activePage === 'dashboard' && <ApprovedInterns />}
          {activePage === 'approvals' && (
            <PendingApprovals
              pendingInterns={pendingInterns}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
