import { useEffect, useState } from 'react';
import { getArchivedBatches, restoreBatch, permanentDeleteBatch } from '../../services/batchService';
import { formatDate } from '../../utils/formatDate';

const buttonStyle = {
  border: 'none',
  borderRadius: '6px',
  padding: '6px 14px',
  fontSize: '13px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'background 0.2s'
};

const ArchivedBatches = ({ onRestoreSuccess }) => {
  const [archived, setArchived] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchArchivedBatches = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getArchivedBatches();
      setArchived(data || []);
    } catch (err) {
      console.error('Error fetching archived batches:', err.message);
      setError('Failed to fetch archived batches.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedBatches();
  }, []);

  const handleRestore = async (id) => {
    try {
      await restoreBatch(id);
      alert('Batch restored successfully.');
      setArchived((prev) => prev.filter((batch) => batch.id !== id));
      if (onRestoreSuccess) {
        onRestoreSuccess();
      }
    } catch (err) {
      alert(`Restore failed: ${err.message}`);
    }
  };

  const handleDeletePermanently = async (id) => {
    if (!window.confirm('This will permanently delete the batch record. Interns in this batch will be kept, but their batch reference may be cleared. This action cannot be undone. Are you sure?')) {
      return;
    }

    try {
      await permanentDeleteBatch(id);
      alert('Batch permanently deleted.');
      setArchived((prev) => prev.filter((batch) => batch.id !== id));
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div style={{
      width: '100%',
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
        <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#111111', margin: 0 }}>Archived Batches</h2>
        <p style={{ color: '#757575', fontSize: '14px', marginTop: '4px', marginBottom: 0 }}>
          Manage archived batches, restore them to batch management, or permanently remove the batch record.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#757575' }}>Loading archived batches...</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#B00020', fontWeight: 600 }}>{error}</div>
      ) : archived.length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 20px',
          textAlign: 'center'
        }}>
          <i className="ti ti-archive" style={{ fontSize: '44px', color: '#BDBDBD', marginBottom: '14px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#212121', margin: 0 }}>No archived batches</h3>
          <p style={{ color: '#9E9E9E', fontSize: '14px', margin: '6px 0 0 0' }}>Archived batches will appear here.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #E0E0E0', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#F9FAFB' }}>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#4A5568', borderBottom: '1px solid #E0E0E0' }}>Batch</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#4A5568', borderBottom: '1px solid #E0E0E0' }}>Mentor</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#4A5568', borderBottom: '1px solid #E0E0E0' }}>Interns</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#4A5568', borderBottom: '1px solid #E0E0E0' }}>Archived Date</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#4A5568', borderBottom: '1px solid #E0E0E0', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {archived.map((batch) => (
                <tr key={batch.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: '#1A202C' }}>{batch.batch_number}</td>
                  <td style={{ padding: '16px', fontSize: '14px', color: '#4A5568' }}>{batch.mentor_name || 'Unassigned'}</td>
                  <td style={{ padding: '16px', fontSize: '14px', color: '#4A5568' }}>{batch.intern_count || 0}</td>
                  <td style={{ padding: '16px', fontSize: '14px', color: '#4A5568' }}>{formatDate(batch.archived_at)}</td>
                  <td style={{ padding: '16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      onClick={() => handleRestore(batch.id)}
                      style={{ ...buttonStyle, background: '#3D35C4', color: '#FFFFFF', marginRight: '8px' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#2A259A'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#3D35C4'}
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => handleDeletePermanently(batch.id)}
                      style={{ ...buttonStyle, background: '#B00020', color: '#FFFFFF' }}
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

export default ArchivedBatches;
