# CYBERDUDEBIVASH® Backend — Deployment Guide

## LOCAL DEVELOPMENT

```cmd
REM 1. Setup environment
cd backend
copy .env.example .env
REM Edit .env with your keys

REM 2. Start server
node server.js
REM → Running at http://localhost:3001
```

Or double-click `START-BACKEND.bat` from the project root.

---

## PRODUCTION DEPLOY — Railway (Recommended, Free Tier Available)

```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Login
railway login

# 3. From backend/ directory
cd backend
railway init
railway up

# 4. Set environment variables in Railway dashboard:
#    JWT_SECRET=your_strong_secret_here
#    RAZORPAY_KEY_ID=rzp_live_XXXXX
#    RAZORPAY_KEY_SECRET=XXXXX
#    ADMIN_SECRET=your_admin_secret
#    NODE_ENV=production
#    FRONTEND_URL=https://www.cyberdudebivash.com
```

Railway auto-assigns a URL like: `https://cyberdudebivash-backend.up.railway.app`

---

## PRODUCTION DEPLOY — Render (Free Tier)

1. Go to https://render.com → New Web Service
2. Connect GitHub repo
3. Set:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
4. Add Environment Variables (same as Railway above)

---

## AFTER DEPLOY

Update `portal/index.html` line:
```js
const API_BASE = 'https://YOUR-RAILWAY-OR-RENDER-URL';
```

---

## ENVIRONMENT VARIABLES REQUIRED

| Key | Description |
|-----|-------------|
| `JWT_SECRET` | Long random string (32+ chars) |
| `RAZORPAY_KEY_ID` | From Razorpay dashboard |
| `RAZORPAY_KEY_SECRET` | From Razorpay dashboard |
| `ADMIN_SECRET` | Secret for /analytics endpoint |
| `FRONTEND_URL` | https://www.cyberdudebivash.com |
| `PORT` | 3001 (auto-set by Railway/Render) |

---

## API ENDPOINT SUMMARY

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/register | None | Register user + auto-generate API key |
| POST | /auth/login | None | Login, returns JWT |
| GET | /auth/me | JWT | Get profile, keys, usage |
| POST | /generate-api-key | JWT | Generate new API key |
| GET | /api-keys | JWT | List all API keys |
| DELETE | /api-keys/:id | JWT | Revoke API key |
| GET | /api-usage | JWT | Usage statistics |
| GET | /api/validate | API Key | Validate key + check rate limit |
| POST | /create-order | JWT | Create Razorpay payment order |
| POST | /verify-payment | JWT | Verify payment signature + upgrade plan |
| GET | /payment-history | JWT | List payment history |
| POST | /lead | None | Submit lead capture form |
| POST | /track-event | None | Track analytics event |
| GET | /analytics | Admin | Full platform analytics |
| GET | /health | None | Health check |

---

## MONETIZATION FLOW

```
Homepage → Platform Section → Sign Up (portal/index.html)
→ /auth/register → API key issued automatically
→ User hits rate limit (100/day free)
→ Portal shows upgrade prompt
→ /create-order → Razorpay checkout opens
→ Payment success → /verify-payment → plan upgraded
→ User gets 1,000 / 10,000 / unlimited calls/day
```
