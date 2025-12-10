import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardStats } from '../services/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const styles = {
  header: {
    marginBottom: '30px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a1a2e',
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    marginTop: '4px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1a1a2e',
  },
  statLabel: {
    fontSize: '14px',
    color: '#666',
    marginTop: '4px',
  },
  statChange: {
    fontSize: '13px',
    marginTop: '8px',
  },
  statChangePositive: {
    color: '#22c55e',
  },
  statChangeNegative: {
    color: '#ef4444',
  },
  chartsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  chartTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: '20px',
  },
  recentUsersCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  viewAllLink: {
    fontSize: '14px',
    color: '#007AFF',
    fontWeight: '500',
  },
  userList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  userItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    textDecoration: 'none',
    color: 'inherit',
  },
  userAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#007AFF',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    marginRight: '12px',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1a1a2e',
  },
  userEmail: {
    fontSize: '13px',
    color: '#666',
  },
  userDate: {
    fontSize: '12px',
    color: '#999',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '200px',
    color: '#666',
  },
};

function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getInitials = (email, firstName, lastName) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    return email ? email[0].toUpperCase() : '?';
  };

  if (loading) {
    return <div style={styles.loading}>Loading dashboard...</div>;
  }

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Dashboard</h1>
        <p style={styles.subtitle}>Overview of your app's performance</p>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats?.totalUsers || 0}</div>
          <div style={styles.statLabel}>Total Users</div>
          {stats?.newUsersThisWeek > 0 && (
            <div style={{ ...styles.statChange, ...styles.statChangePositive }}>
              +{stats.newUsersThisWeek} this week
            </div>
          )}
        </div>

        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats?.activeUsersToday || 0}</div>
          <div style={styles.statLabel}>Active Today</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats?.totalWorkouts || 0}</div>
          <div style={styles.statLabel}>Total Workouts</div>
          {stats?.workoutsThisWeek > 0 && (
            <div style={{ ...styles.statChange, ...styles.statChangePositive }}>
              +{stats.workoutsThisWeek} this week
            </div>
          )}
        </div>

        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats?.totalMeals || 0}</div>
          <div style={styles.statLabel}>Total Meals Logged</div>
          {stats?.mealsThisWeek > 0 && (
            <div style={{ ...styles.statChange, ...styles.statChangePositive }}>
              +{stats.mealsThisWeek} this week
            </div>
          )}
        </div>
      </div>

      {/* Charts */}
      <div style={styles.chartsRow}>
        <div style={styles.chartCard}>
          <div style={styles.chartTitle}>User Signups (Last 30 Days)</div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={stats?.signupsByDay || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tickFormatter={formatDate} fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip labelFormatter={formatDate} />
              <Area type="monotone" dataKey="count" stroke="#007AFF" fill="#007AFF" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.chartCard}>
          <div style={styles.chartTitle}>Activity (Last 7 Days)</div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats?.activityByDay || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tickFormatter={formatDate} fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip labelFormatter={formatDate} />
              <Bar dataKey="workouts" fill="#22c55e" name="Workouts" />
              <Bar dataKey="meals" fill="#f59e0b" name="Meals" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Users */}
      <div style={styles.recentUsersCard}>
        <div style={styles.cardHeader}>
          <h2 style={styles.chartTitle}>Recent Signups</h2>
          <Link to="/users" style={styles.viewAllLink}>View All Users →</Link>
        </div>
        <div style={styles.userList}>
          {(stats?.recentUsers || []).map((user) => (
            <Link
              key={user.id}
              to={`/users/${user.id}`}
              style={styles.userItem}
            >
              <div style={styles.userAvatar}>
                {getInitials(user.email, user.first_name, user.last_name)}
              </div>
              <div style={styles.userInfo}>
                <div style={styles.userName}>
                  {user.first_name && user.last_name
                    ? `${user.first_name} ${user.last_name}`
                    : user.email}
                </div>
                <div style={styles.userEmail}>{user.email}</div>
              </div>
              <div style={styles.userDate}>
                {formatDate(user.created_at)}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
