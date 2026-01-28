import React from 'react';
function Tools() {
  const tools = [
    { name: 'Malware Analyzer', desc: 'Advanced malware analysis platform', status: 'Available' },
    { name: 'Network Scanner', desc: 'Enterprise network scanning tool', status: 'Available' },
    { name: 'Threat Hunter', desc: 'AI-powered threat hunting', status: 'Available' },
    { name: 'IOC Database', desc: 'Indicators of Compromise database', status: 'Available' }
  ];
  return (
    <div className="page"><h1>Security Tools</h1>
    <div className="tools-grid">{tools.map((tool, i) => (
      <div key={i} className="tool-card">
        <h3>{tool.name}</h3>
        <p>{tool.desc}</p>
        <span className="badge-success">{tool.status}</span>
        <button>Launch Tool</button>
      </div>
    ))}</div></div>
  );
}
export default Tools;
