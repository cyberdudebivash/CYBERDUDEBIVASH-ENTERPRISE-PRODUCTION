import React from 'react';
function Dashboard({ user }) {
  return (
    <div className="page">
      <h1>Welcome, {user?.name}!</h1>
      <div className="stats-grid">
        <div className="stat-card"><h3>3</h3><p>Active Licenses</p></div>
        <div className="stat-card"><h3>12</h3><p>Tools Accessed</p></div>
        <div className="stat-card"><h3>1</h3><p>Open Tickets</p></div>
        <div className="stat-card"><h3>2,547</h3><p>API Calls Today</p></div>
      </div>
      <div className="card"><h3>Recent Activity</h3><ul><li>Accessed Malware Analyzer - 2h ago</li><li>Downloaded Threat Report - 5h ago</li><li>Updated License - 1d ago</li></ul></div>
    </div>
  );
}
export default Dashboard;
