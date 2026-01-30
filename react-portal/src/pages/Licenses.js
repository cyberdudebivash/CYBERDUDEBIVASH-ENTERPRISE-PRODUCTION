import React from 'react';
function Licenses() {
  const licenses = [
    { name: 'Professional Plan', key: 'CYBD-PROF-2026-A1B2C3', : 'Active', expires: '2027-01-27' },
    { name: 'API Access', key: 'CYBD-API-2026-X9Y8Z7', : 'Active', expires: '2027-01-27' },
    { name: 'Premium Tools', key: 'CYBD-TOOL-2026-M5N6O7', : 'Active', expires: '2027-01-27' }
  ];
  return (
    <div className="page"><h1>License Management</h1>
    <div className="licenses-grid">{licenses.map((lic, i) => (
      <div key={i} className="license-card">
        <h3>{lic.name}</h3>
        <p><strong>Key:</strong> <code>{lic.key}</code></p>
        <p><strong>:</strong> <span className="badge-success">{lic.}</span></p>
        <p><strong>Expires:</strong> {lic.expires}</p>
        <button>Renew</button>
      </div>
    ))}</div></div>
  );
}
export default Licenses;
