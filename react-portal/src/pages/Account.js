import React from 'react';
function Account({ user }) {
  return (
    <div className="page"><h1>Account Settings</h1>
    <div className="card">
      <h3>Profile Information</h3>
      <p><strong>Name:</strong> {user?.name}</p>
      <p><strong>Email:</strong> {user?.email}</p>
      <p><strong>Plan:</strong> {user?.plan}</p>
      <p><strong>Company:</strong> {user?.company || 'N/A'}</p>
      <button>Edit Profile</button>
    </div>
    <div className="card">
      <h3>Security</h3>
      <button>Change Password</button>
      <button>Enable 2FA</button>
    </div>
    </div>
  );
}
export default Account;
