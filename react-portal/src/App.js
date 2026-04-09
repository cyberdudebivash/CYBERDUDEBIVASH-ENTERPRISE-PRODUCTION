import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import './App.css';

// Pages
import Dashboard from './pages/Dashboard';
import Licenses from './pages/Licenses';
import Tools from './pages/Tools';
import Support from './pages/Support';
import Account from './pages/Account';
import Login from './pages/Login';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  const handleLogin = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="portal-app">
        <Sidebar user={user} onLogout={handleLogout} />
        <main className="portal-main">
          <Routes>
            <Route path="/" element={<Dashboard user={user} />} />
            <Route path="/licenses" element={<Licenses />} />
            <Route path="/tools" element={<Tools />} />
            <Route path="/support" element={<Support user={user} />} />
            <Route path="/account" element={<Account user={user} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function Sidebar({ user, onLogout }) {
  return (
    <aside className="portal-sidebar">
      <div className="sidebar-header">
        <img src="../../assets/images/logo.jpg" alt="CYBERDUDEBIVASH" className="sidebar-logo" />
        <h2>CYBERDUDEBIVASH®</h2>
        <p className="sidebar-subtitle">Client Portal</p>
      </div>
      
      <nav className="sidebar-nav">
        <Link to="/" className="sidebar-link">
          <span className="icon">📊</span>
          Dashboard
        </Link>
        <Link to="/licenses" className="sidebar-link">
          <span className="icon">🔑</span>
          Licenses
        </Link>
        <Link to="/tools" className="sidebar-link">
          <span className="icon">🔧</span>
          Tools Access
        </Link>
        <Link to="/support" className="sidebar-link">
          <span className="icon">💬</span>
          Support
        </Link>
        <Link to="/account" className="sidebar-link">
          <span className="icon">⚙️</span>
          Account
        </Link>
      </nav>
      
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{user?.name?.charAt(0) || 'U'}</div>
          <div>
            <div className="user-name">{user?.name || 'User'}</div>
            <div className="user-plan">{user?.plan || 'Professional'} Plan</div>
          </div>
        </div>
        <button onClick={onLogout} className="btn-logout">Logout</button>
      </div>
    </aside>
  );
}

export default App;
