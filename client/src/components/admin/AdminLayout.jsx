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
    <div className="admin-layout-container">
      {/* Fixed Left Sidebar */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        pendingCount={pendingInterns.length}
        onLogout={onLogout}
      />

      {/* Main Content Pane */}
      <main className="admin-main-content">
        {/* Top Header */}
        <header className="admin-page-header" role="banner">
          <h1 className="admin-header-title">{getPageTitle()}</h1>
          <div className="admin-header-right">
            <span className="admin-user-badge">Admin Panel</span>
          </div>
        </header>

        {/* Dynamic Page Views */}
        <div className="admin-page-body">
          {activePage === 'dashboard' ? (
            <ApprovedInterns />
          ) : (
            <PendingApprovals
              pendingInterns={pendingInterns}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
