import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
  },
  sidebar: {
    width: '250px',
    backgroundColor: '#1a1a2e',
    color: '#fff',
    padding: '20px 0',
    display: 'flex',
    flexDirection: 'column',
  },
  logo: {
    padding: '0 20px 30px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    marginBottom: '20px',
  },
  logoText: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#fff',
  },
  logoSubtext: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    marginTop: '4px',
  },
  nav: {
    flex: 1,
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 20px',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
    borderLeft: '3px solid transparent',
  },
  navLinkActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    borderLeftColor: '#007AFF',
  },
  navIcon: {
    marginRight: '12px',
    fontSize: '18px',
  },
  userSection: {
    padding: '20px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
  },
  userEmail: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: '10px',
  },
  logoutButton: {
    width: '100%',
    padding: '10px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
  },
  main: {
    flex: 1,
    padding: '30px',
    overflowY: 'auto',
  },
};

function Layout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getLinkStyle = ({ isActive }) => ({
    ...styles.navLink,
    ...(isActive ? styles.navLinkActive : {}),
  });

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <div style={styles.logoText}>MyFitBody</div>
          <div style={styles.logoSubtext}>Admin Dashboard</div>
        </div>

        <nav style={styles.nav}>
          <NavLink to="/" end style={getLinkStyle}>
            <span style={styles.navIcon}>📊</span>
            Dashboard
          </NavLink>
          <NavLink to="/users" style={getLinkStyle}>
            <span style={styles.navIcon}>👥</span>
            Users
          </NavLink>
        </nav>

        <div style={styles.userSection}>
          <div style={styles.userEmail}>{admin?.email}</div>
          <button style={styles.logoutButton} onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </aside>

      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
