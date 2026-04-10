/**
 * database.js — LowDB file-based JSON database
 * CYBERDUDEBIVASH® SaaS Backend
 * Pure JS — no native compilation required
 */
const { Low } = require('lowdb');
const { JSONFileSync } = require('lowdb/node');
const path = require('path');
const fs   = require('fs');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const adapter = new JSONFileSync(path.join(DATA_DIR, 'db.json'));
const db = new Low(adapter, {
  users:    [],
  api_keys: [],
  api_usage:[],
  payments: [],
  leads:    [],
  events:   [],
  _seq: { users:0, api_keys:0, api_usage:0, payments:0, leads:0, events:0 }
});

db.read();

// Auto-save helper
db.save = function() { db.write(); };

// Sequence helper
db.nextId = function(table) {
  db.data._seq[table] = (db.data._seq[table] || 0) + 1;
  return db.data._seq[table];
};

// ===== TABLE HELPERS =====

// users
db.users = {
  findByEmail: (email) => db.data.users.find(u => u.email === email.toLowerCase()),
  findById:    (id)    => db.data.users.find(u => u.id === id),
  insert: (name, email, password, plan='free') => {
    const now = Math.floor(Date.now()/1000);
    const rec = { id: db.nextId('users'), name, email: email.toLowerCase(), password, plan, created_at: now, updated_at: now };
    db.data.users.push(rec);
    db.save();
    return rec;
  },
  updatePlan: (id, plan) => {
    const u = db.data.users.find(u => u.id === id);
    if (u) { u.plan = plan; u.updated_at = Math.floor(Date.now()/1000); db.save(); }
  }
};

// api_keys
db.apiKeys = {
  findByKey: (key) => {
    const ak = db.data.api_keys.find(k => k.api_key === key && k.active);
    if (!ak) return null;
    const user = db.data.users.find(u => u.id === ak.user_id);
    return user ? { ...ak, plan: user.plan } : null;
  },
  forUser: (userId) => db.data.api_keys.filter(k => k.user_id === userId),
  activeForUser: (userId) => db.data.api_keys.filter(k => k.user_id === userId && k.active),
  insert: (userId, apiKey) => {
    const rec = { id: db.nextId('api_keys'), user_id: userId, api_key: apiKey, active: true, created_at: Math.floor(Date.now()/1000) };
    db.data.api_keys.push(rec);
    db.save();
    return rec;
  },
  revoke: (id, userId) => {
    const k = db.data.api_keys.find(k => k.id === id && k.user_id === userId);
    if (k) { k.active = false; db.save(); return true; }
    return false;
  }
};

// api_usage
db.apiUsage = {
  insert: (userId, apiKey, endpoint) => {
    db.data.api_usage.push({ id: db.nextId('api_usage'), user_id: userId, api_key: apiKey, endpoint, used_at: Math.floor(Date.now()/1000) });
    db.save();
  },
  countToday: (apiKey) => {
    const dayStart = Math.floor(Date.now()/86400000)*86400;
    return db.data.api_usage.filter(r => r.api_key === apiKey && r.used_at >= dayStart).length;
  },
  statsForUser: (userId) => {
    const dayStart  = Math.floor(Date.now()/86400000)*86400;
    const weekStart = dayStart - 6*86400;
    const rows = db.data.api_usage.filter(r => r.user_id === userId);
    const today = rows.filter(r => r.used_at >= dayStart).length;
    const week  = rows.filter(r => r.used_at >= weekStart).length;
    const endpointMap = {};
    rows.forEach(r => { endpointMap[r.endpoint] = (endpointMap[r.endpoint]||0)+1; });
    const by_endpoint = Object.entries(endpointMap).map(([e,c])=>({endpoint:e,calls:c})).sort((a,b)=>b.calls-a.calls).slice(0,10);
    return { today, week, total: rows.length, by_endpoint };
  }
};

// payments
db.payments = {
  insert: (userId, orderId, plan, amount, currency) => {
    const rec = { id: db.nextId('payments'), user_id: userId, razorpay_order: orderId, razorpay_pay_id:'', plan, amount, currency, status:'created', created_at: Math.floor(Date.now()/1000) };
    db.data.payments.push(rec);
    db.save();
    return rec;
  },
  findByOrder: (orderId) => db.data.payments.find(p => p.razorpay_order === orderId),
  verify: (orderId, payId) => {
    const p = db.data.payments.find(p => p.razorpay_order === orderId);
    if (p) { p.razorpay_pay_id = payId; p.status = 'paid'; db.save(); }
    return p;
  },
  forUser: (userId) => db.data.payments.filter(p => p.user_id === userId).sort((a,b)=>b.created_at-a.created_at)
};

// leads
db.leads = {
  insert: (name, email, company, company_size, message, source) => {
    const rec = { id: db.nextId('leads'), name, email: email.toLowerCase(), company, company_size, message, source, created_at: Math.floor(Date.now()/1000) };
    db.data.leads.push(rec);
    db.save();
    return rec;
  },
  all: () => [...db.data.leads].sort((a,b)=>b.created_at-a.created_at)
};

// events
db.events = {
  insert: (userId, eventType, payload, ip) => {
    db.data.events.push({ id: db.nextId('events'), user_id: userId||null, event_type: eventType, payload: JSON.stringify(payload||{}), ip: String(ip||'').slice(0,64), created_at: Math.floor(Date.now()/1000) });
    db.save();
  },
  topTypes: () => {
    const map = {};
    db.data.events.forEach(e => { map[e.event_type]=(map[e.event_type]||0)+1; });
    return Object.entries(map).map(([t,c])=>({event_type:t,cnt:c})).sort((a,b)=>b.cnt-a.cnt).slice(0,10);
  }
};

module.exports = db;
