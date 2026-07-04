import { useState, useEffect } from 'react';
import { getArchivedInterns, restoreIntern, permanentDeleteIntern } from '../../services/internService';
import { formatDate } from '../../utils/formatDate';

const ArchivedInterns = ({ onRestoreSuccess }) => {
  const [archived, setArchived] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchArchived = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getArchivedInterns();
      setArchived(data || []);
    } catch (err) {
      console.error('Error fetching archived interns:', err.message);
      setError('Failed to fetch archived interns.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchived();
  }, []);

  const handleRestore = async (id) => {
    try {
      await restoreIntern(id);
      alert('Intern restored successfully and moved to pending approvals.');
      setArchived((prev) => prev.filter((i) => i.id !== id));
      if (onRestoreSuccess) {
        onRestoreSuccess();
      }
    } catch (err) {
      alert(`Restore failed: ${err.message}`);
    }
  };

  const handleDeletePermanently = async (id) => {
    if (window.confirm("This will permanently delete all data for this intern including tasks, project, and profile. This action cannot be undone. Are you sure?")) {
      try {
        await permanentDeleteIntern(id);
        alert('Intern permanently deleted.');
        setArchived((prev) => prev.filter((i) => i.id !== id));
      } catch (err) {
        alert(`Delete failed: ${err.message}`);
      }
    }
  };

  return (
    <div style={{
      width: '100%',
      flex: 1,
      background: '#FFFFFF',
      borderRadius: '12px',
      border: '1px solid #E0E0E0',
      padding: '32px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#111111', margin: 0 }}>Archived Interns</h2>
        <p style={{ color: '#757575', fontSize: '14px', marginTop: '4px', marginBottom: 0 }}>
          Manage archived interns, restore accounts, or permanently remove their data.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#757575' }}>Loading archived interns...</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#B00020', fontWeight: 600 }}>{error}</div>
      ) : archived.length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          textAlign: 'center'
        }}>
          <i className="ti ti-archive" style={{ fontSize: '48px', color: '#BDBDBD', marginBottom: '16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#212121', margin: 0 }}>Archive is empty</h3>
          <p style={{ color: '#9E9E9E', fontSize: '14px', marginTop: '6px', margin: '6px 0 0 0' }}>No archived interns found</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #E0E0E0', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#F9FAFB' }}>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#4A5568', borderBottom: '1px solid #E0E0E0' }}>Name</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#4A5568', borderBottom: '1px solid #E0E0E0' }}>College</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#4A5568', borderBottom: '1px solid #E0E0E0' }}>Batch</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#4A5568', borderBottom: '1px solid #E0E0E0' }}>Archived Date</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#4A5568', borderBottom: '1px solid #E0E0E0', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {archived.map((intern) => (
                <tr key={intern.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: '#1A202C' }}>{intern.name}</td>
                  <td style={{ padding: '16px', fontSize: '14px', color: '#4A5568' }}>{intern.college_name || intern.collegeName || '—'}</td>
                  <td style={{ padding: '16px', fontSize: '14px', color: '#4A5568' }}>{intern.batch_number || '—'}</td>
                  <td style={{ padding: '16px', fontSize: '14px', color: '#4A5568' }}>{formatDate(intern.archived_at)}</td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleRestore(intern.id)}
                      style={{
                        background: '#3D35C4',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 14px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        marginRight: '8px',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#2A259A'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#3D35C4'}
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => handleDeletePermanently(intern.id)}
                      style={{
                        background: '#B00020',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 14px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#8F0018'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#B00020'}
                    >
                      Delete Permanently
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ArchivedInterns;
