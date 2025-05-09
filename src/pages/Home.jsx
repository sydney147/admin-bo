// src/pages/Home.jsx
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate, NavLink, Outlet } from 'react-router-dom';
import './Home.css';

function Home() {
  const navigate = useNavigate();

  const handleLogout = () => {
    signOut(auth).then(() => {
      navigate('/');
    });
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="logo">☰</div>
        <nav className="menu">
          <NavLink to="dashboard" className="menu-item">
            <span className="icon">🏠</span>
            <span className="text">Home</span>
          </NavLink>
          <NavLink to="shopprofile" className="menu-item">
            <span className="icon">🏪</span>
            <span className="text">Shop</span>
          </NavLink>
          <NavLink to="products" className="menu-item">
            <span className="icon">📦</span>
            <span className="text">Products</span>
          </NavLink>
          <NavLink to="sales" className="menu-item">
            <span className="icon">📊</span>
            <span className="text">Sales</span>
          </NavLink>
          <NavLink to="orders" className="menu-item">
            <span className="icon">📬</span>
            <span className="text">Orders</span>
          </NavLink>
          <NavLink to="feedback" className="menu-item">
            <span className="icon">🌟</span>
            <span className="text">Feedback</span>
          </NavLink>
          <NavLink to="notifications" className="menu-item notifications-link">
            <span className="icon">🔔</span>
            <span className="text">Notifications</span>
            {localStorage.getItem('hasUnreadNotif') === 'true' && (
              <span className="notif-dot" />
            )}
          </NavLink>

          <NavLink to="settings" className="menu-item">
            <span className="icon">⚙️</span>
            <span className="text">Settings</span>
          </NavLink>
        </nav>
        <button className="logout-btn" onClick={handleLogout}>
          <span className="icon">🚪</span>
          <span className="text">Logout</span>
        </button>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Home;
