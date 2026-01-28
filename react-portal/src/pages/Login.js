import React, { useState } from 'react';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email && password) {
      onLogin({ name: email.split('@')[0], email, plan: 'Professional' });
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>CYBERDUDEBIVASH®</h1>
          <p>Client Portal</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
          <button type="submit">Sign In</button>
          <p style={{fontSize:'0.9rem',color:'#999',marginTop:'1rem'}}>Demo: Enter any email/password</p>
        </form>
        <a href="../../index.html">← Back to Main Site</a>
      </div>
    </div>
  );
}
export default Login;
