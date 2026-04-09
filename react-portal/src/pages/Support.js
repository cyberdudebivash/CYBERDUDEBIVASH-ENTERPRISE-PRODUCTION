import React, { useState } from 'react';
function Support({ user }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Support ticket submitted!');
    setSubject('');
    setMessage('');
  };
  return (
    <div className="page"><h1>Support</h1>
    <form onSubmit={handleSubmit} className="support-form">
      <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" required />
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe your issue..." rows="6" required></textarea>
      <button type="submit">Submit Ticket</button>
    </form>
    <div className="card"><h3>Recent Tickets</h3><ul><li>#1234 - API Integration Issue - Resolved</li><li>#1233 - License Renewal - Open</li></ul></div>
    </div>
  );
}
export default Support;
