try {
  require('express');
  require('bcryptjs');
  require('jsonwebtoken');
  require('lowdb');
  require('razorpay');
  require('uuid');
  require('helmet');
  require('express-rate-limit');
  console.log('ALL DEPS OK');
} catch(e) { console.error('MISSING:', e.message); }
