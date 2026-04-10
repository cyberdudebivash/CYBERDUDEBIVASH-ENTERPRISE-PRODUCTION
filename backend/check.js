try {
  require('express');
  require('bcryptjs');
  require('jsonwebtoken');
  require('better-sqlite3');
  require('razorpay');
  require('uuid');
  require('helmet');
  require('express-rate-limit');
  console.log('ALL DEPS OK');
} catch(e) { console.error('MISSING:', e.message); }
