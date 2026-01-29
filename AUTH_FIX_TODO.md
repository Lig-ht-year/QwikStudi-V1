# TODO: Authentication Fixes

## Problem
The frontend login and signup pages were FAKE - they didn't call Django's JWT authentication. Users saw a "logged in" UI but Django didn't recognize them.

## Solution Applied

### 1. Fixed Login Page (`src/app/login/page.tsx`)
- Now calls `/api/auth/login/` endpoint
- Extracts username from email (everything before @)
- Stores `access` and `refresh` tokens in localStorage
- Updates local state with username
- Properly handles errors

### 2. Fixed Signup Page (`src/app/signup/page.tsx`)
- Now calls `/api/auth/register/` endpoint
- Sends username, email, password to Django
- Stores `access` and `refresh` tokens in localStorage
- Updates local state with username
- Properly handles errors

### 3. Fixed Logout (`src/lib/auth.ts`)
- Clears tokens from localStorage
- Calls `/api/auth/logout/` to blacklist the token
- Redirects to login page

### 4. Fixed dataStore logout (`src/stores/dataStore.ts`)
- Clears tokens from localStorage
- Resets all state (including chatId)

## Files Modified
1. ✅ `glinax-frontend/src/app/login/page.tsx`
2. ✅ `glinax-frontend/src/app/signup/page.tsx`
3. ✅ `glinax-frontend/src/lib/auth.ts`
4. ✅ `glinax-frontend/src/stores/dataStore.ts`

## Testing Steps
1. Restart Django server
2. Restart Next.js dev server
3. Go to `/signup` and create a new account
4. Verify you're redirected to home with tokens in localStorage
5. Go to `/login` and login with the same credentials
6. Send a chat message
7. Check Django logs - should show `user: <username>` not `user: None`

## Backend Endpoints (Already Working)
- `/api/auth/login/` - JWT token endpoint
- `/api/auth/register/` - Registration
- `/api/auth/refresh/` - Token refresh
- `/api/auth/me/` - Get current user
- `/api/auth/logout/` - Logout

