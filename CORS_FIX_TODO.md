# CORS Fix TODO

## Problem
Cross-Origin Request Blocked error when frontend (localhost:3000) tries to access backend (localhost:8000/chat/)
- Reason: CORS header 'Access-Control-Allow-Origin' missing

## Root Cause Analysis
1. Frontend uses NEXT_PUBLIC_API_URL which needs to point to backend
2. CORS middleware was at top of MIDDLEWARE list but CORS_ALLOW_ALL_ORIGINS was False
3. Needed to properly configure CORS for development

## Fix Plan - COMPLETED

### Step 1: Update Django settings.py ✓
- Changed CORS_ALLOW_ALL_ORIGINS = DEBUG (allow all origins in debug mode)
- Added explicit localhost:8000 and 127.0.0.1:8000 to CORS_ALLOWED_ORIGINS
- Added environment variable support for CORS_ALLOWED_ORIGINS

### Step 2: Update Frontend env.ts ✓
- Uncommented NEXT_PUBLIC_API_URL from required environment variables
- Updated interface and getEnv() to include NEXT_PUBLIC_API_URL

### Step 3: Create .env.local file ✓
- Added NEXT_PUBLIC_API_URL=http://localhost:8000

## Next Steps - Restart Servers

Run these commands to apply the fixes:

```bash
# Terminal 1 - Restart Django backend
cd /home/dip/Documents/Dev/GLINAX-main/gweb
python manage.py runserver 0.0.0.0:8000

# Terminal 2 - Restart Next.js frontend
cd /home/dip/Documents/Dev/GLINAX-main/glinax-frontend
npm run dev
```

## Verification
After restarting both servers:
1. Open http://localhost:3000
2. Try the chat functionality
3. Check browser console - CORS error should be resolved
4. Check Django console - should see proper CORS headers in requests

