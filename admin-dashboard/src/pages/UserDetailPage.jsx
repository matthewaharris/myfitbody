import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getUserById, getUserActivity, suspendUser, unsuspendUser, deleteUser, resetUserPassword, toggleUserAdmin } from '../services/api';

const styles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '30px',
  },
  backButton: {
    padding: '8px 12px',
    fontSize: '14px',
    color: '#007AFF',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a1a2e',
    flex: 1,
  },
  actionButtons: {
    display: 'flex',
    gap: '10px',
  },
  button: {
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '500',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    color: '#fff',
  },
  warningButton: {
    backgroundColor: '#f59e0b',
    color: '#fff',
  },
  dangerButton: {
    backgroundColor: '#ef4444',
    color: '#fff',
  },
  successButton: {
    backgroundColor: '#22c55e',
    color: '#fff',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: '20px',
    paddingBottom: '12px',
    borderBottom: '1px solid #eee',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid #f5f5f5',
  },
  infoLabel: {
    fontSize: '14px',
    color: '#666',
  },
  infoValue: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1a1a2e',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
  },
  statusActive: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  statusSuspended: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '20px',
  },
  statBox: {
    textAlign: 'center',
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1a1a2e',
  },
  statLabel: {
    fontSize: '12px',
    color: '#666',
    marginTop: '4px',
  },
  activityList: {
    maxHeight: '300px',
    overflowY: 'auto',
  },
  activityItem: {
    display: 'flex',
    alignItems: 'flex-start',
    padding: '12px 0',
    borderBottom: '1px solid #f5f5f5',
  },
  activityIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#f0f7ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '12px',
    fontSize: '14px',
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: '14px',
    color: '#1a1a2e',
  },
  activityTime: {
    fontSize: '12px',
    color: '#999',
    marginTop: '2px',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '200px',
    color: '#666',
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    width: '400px',
    maxWidth: '90%',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '16px',
  },
  modalText: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '20px',
  },
  modalInput: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  modalButtons: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
  },
};

function UserDetailPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadUserData();
  }, [userId]);

  const loadUserData = async () => {
    try {
      const [userData, activityData] = await Promise.all([
        getUserById(userId),
        getUserActivity(userId),
      ]);
      setUser(userData);
      setActivity(activityData.activities || []);
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async () => {
    setActionLoading(true);
    try {
      await suspendUser(userId, suspendReason);
      setUser({ ...user, is_suspended: true });
      setShowSuspendModal(false);
      setSuspendReason('');
    } catch (error) {
      alert('Failed to suspend user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnsuspend = async () => {
    setActionLoading(true);
    try {
      await unsuspendUser(userId);
      setUser({ ...user, is_suspended: false });
    } catch (error) {
      alert('Failed to unsuspend user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await deleteUser(userId);
      navigate('/users');
    } catch (error) {
      alert('Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!confirm('This will send a password reset email to the user. Continue?')) return;
    setActionLoading(true);
    try {
      await resetUserPassword(userId);
      alert('Password reset email sent');
    } catch (error) {
      alert('Failed to send password reset email');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleAdmin = async () => {
    const newAdminStatus = !user.is_admin;
    const confirmMsg = newAdminStatus
      ? 'Make this user an admin? They will have access to the admin dashboard.'
      : 'Remove admin privileges from this user?';
    if (!confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      await toggleUserAdmin(userId, newAdminStatus);
      setUser({ ...user, is_admin: newAdminStatus });
      alert(newAdminStatus ? 'User is now an admin' : 'Admin privileges removed');
    } catch (error) {
      alert('Failed to update admin status');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatShortDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'workout': return '🏋️';
      case 'meal': return '🍽️';
      case 'measurement': return '📏';
      case 'water': return '💧';
      default: return '📝';
    }
  };

  if (loading) {
    return <div style={styles.loading}>Loading user...</div>;
  }

  if (!user) {
    return <div style={styles.loading}>User not found</div>;
  }

  return (
    <div>
      <div style={styles.header}>
        <button style={styles.backButton} onClick={() => navigate('/users')}>
          ← Back to Users
        </button>
        <h1 style={styles.title}>
          {user.first_name && user.last_name
            ? `${user.first_name} ${user.last_name}`
            : user.email}
        </h1>
        <div style={styles.actionButtons}>
          <button
            style={{ ...styles.button, ...styles.primaryButton }}
            onClick={handleResetPassword}
            disabled={actionLoading}
          >
            Reset Password
          </button>
          <button
            style={{ ...styles.button, backgroundColor: user.is_admin ? '#8b5cf6' : '#6b7280', color: '#fff' }}
            onClick={handleToggleAdmin}
            disabled={actionLoading}
          >
            {user.is_admin ? 'Remove Admin' : 'Make Admin'}
          </button>
          {user.is_suspended ? (
            <button
              style={{ ...styles.button, ...styles.successButton }}
              onClick={handleUnsuspend}
              disabled={actionLoading}
            >
              Unsuspend
            </button>
          ) : (
            <button
              style={{ ...styles.button, ...styles.warningButton }}
              onClick={() => setShowSuspendModal(true)}
              disabled={actionLoading}
            >
              Suspend
            </button>
          )}
          <button
            style={{ ...styles.button, ...styles.dangerButton }}
            onClick={() => setShowDeleteModal(true)}
            disabled={actionLoading}
          >
            Delete
          </button>
        </div>
      </div>

      <div style={styles.grid}>
        {/* User Info Card */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>User Information</h2>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Email</span>
            <span style={styles.infoValue}>{user.email}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Name</span>
            <span style={styles.infoValue}>
              {user.first_name && user.last_name
                ? `${user.first_name} ${user.last_name}`
                : 'Not set'}
            </span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Phone</span>
            <span style={styles.infoValue}>{user.phone_number || 'Not set'}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Status</span>
            <span style={{
              ...styles.statusBadge,
              ...(user.is_suspended ? styles.statusSuspended : styles.statusActive),
            }}>
              {user.is_suspended ? 'Suspended' : 'Active'}
            </span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Role</span>
            <span style={{
              ...styles.statusBadge,
              backgroundColor: user.is_admin ? '#ede9fe' : '#f3f4f6',
              color: user.is_admin ? '#6d28d9' : '#6b7280',
            }}>
              {user.is_admin ? 'Admin' : 'User'}
            </span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Joined</span>
            <span style={styles.infoValue}>{formatDate(user.created_at)}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Last Active</span>
            <span style={styles.infoValue}>
              {user.last_active ? formatDate(user.last_active) : 'Never'}
            </span>
          </div>
        </div>

        {/* Profile Info Card */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Profile Settings</h2>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Fitness Goal</span>
            <span style={styles.infoValue}>
              {user.profile?.weight_goal?.replace('_', ' ') || 'Not set'}
            </span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Starting Weight</span>
            <span style={styles.infoValue}>
              {user.profile?.starting_weight
                ? `${user.profile.starting_weight} ${user.profile.weight_unit || 'lb'}`
                : 'Not set'}
            </span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Calorie Goal</span>
            <span style={styles.infoValue}>
              {user.profile?.macro_targets?.calories || 2000} kcal
            </span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Protein Goal</span>
            <span style={styles.infoValue}>
              {user.profile?.macro_targets?.protein || 150}g
            </span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Dietary Restrictions</span>
            <span style={styles.infoValue}>
              {user.profile?.dietary_restrictions?.length > 0
                ? user.profile.dietary_restrictions.join(', ')
                : 'None'}
            </span>
          </div>
        </div>

        {/* Stats Card */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Activity Stats</h2>
          <div style={styles.statsGrid}>
            <div style={styles.statBox}>
              <div style={styles.statValue}>{user.stats?.workouts || 0}</div>
              <div style={styles.statLabel}>Workouts</div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statValue}>{user.stats?.meals || 0}</div>
              <div style={styles.statLabel}>Meals</div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statValue}>{user.stats?.measurements || 0}</div>
              <div style={styles.statLabel}>Measurements</div>
            </div>
          </div>
        </div>

        {/* Recent Activity Card */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Recent Activity</h2>
          <div style={styles.activityList}>
            {activity.length === 0 ? (
              <p style={{ color: '#666', fontSize: '14px' }}>No recent activity</p>
            ) : (
              activity.map((item, idx) => (
                <div key={idx} style={styles.activityItem}>
                  <div style={styles.activityIcon}>{getActivityIcon(item.type)}</div>
                  <div style={styles.activityContent}>
                    <div style={styles.activityText}>{item.description}</div>
                    <div style={styles.activityTime}>{formatShortDate(item.created_at)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Suspend Modal */}
      {showSuspendModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Suspend User</h3>
            <p style={styles.modalText}>
              Are you sure you want to suspend this user? They will not be able to access the app.
            </p>
            <input
              type="text"
              style={styles.modalInput}
              placeholder="Reason for suspension (optional)"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
            />
            <div style={styles.modalButtons}>
              <button
                style={{ ...styles.button, backgroundColor: '#f0f0f0', color: '#333' }}
                onClick={() => setShowSuspendModal(false)}
              >
                Cancel
              </button>
              <button
                style={{ ...styles.button, ...styles.warningButton }}
                onClick={handleSuspend}
                disabled={actionLoading}
              >
                {actionLoading ? 'Suspending...' : 'Suspend User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Delete User</h3>
            <p style={styles.modalText}>
              Are you sure you want to permanently delete this user and all their data? This action cannot be undone.
            </p>
            <div style={styles.modalButtons}>
              <button
                style={{ ...styles.button, backgroundColor: '#f0f0f0', color: '#333' }}
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                style={{ ...styles.button, ...styles.dangerButton }}
                onClick={handleDelete}
                disabled={actionLoading}
              >
                {actionLoading ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserDetailPage;
