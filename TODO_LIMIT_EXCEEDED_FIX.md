# Limit Exceeded Fix - Implementation Plan

## Task
Handle guest chat limit exceeded responses from the backend and display a proper UI with login prompt.

## Files Modified

### 1. `glinax-frontend/src/lib/translations.ts` ✅
- Added translation keys for limit exceeded messages:
  - `limitExceeded` - Title (e.g., "Chat Limit Reached")
  - `limitExceededMessage` - Message (e.g., "You've reached your guest chat limit...")
  - `loginToContinue` - Button label (e.g., "Log in / Register")
- Added translations for English, French, and Twi

### 2. `glinax-frontend/src/stores/dataStore.ts` ✅
- Added `isLimitExceeded` state to track when guest limit is reached
- Added `setIsLimitExceeded` action to update state
- Updated `logout()` to reset limit exceeded state
- Updated `clearAllData()` to reset limit exceeded state

### 3. `glinax-frontend/src/components/chat/ChatInput.tsx` ✅
- Added limit exceeded state using dataStore
- Added local `limitMessage` state for transient message
- Implemented check for `limit_exceeded: true` in API response
- When limit exceeded:
  - Shows system message banner with login button
  - Disables chat input
  - Prevents adding undefined AI response
- Added UI banner with:
  - Warning icon
  - Title and message
  - Login/Register button linking to `/auth`
  - Close button to dismiss banner

### 4. `glinax-frontend/src/components/chat/MessageBubble.tsx` ✅
- Added `isLimitExceeded` state from dataStore
- Disabled regenerate button when limit is exceeded
- Shows tooltip "Chat limit reached" when disabled

## Expected Behavior
When guest user hits chat limit:
1. ✅ Shows clear message: "Chat Limit Reached"
2. ✅ Message: "You've reached your guest chat limit. Please log in to continue."
3. ✅ "Log in / Register" button linking to `/auth`
4. ✅ Chat input is disabled
5. ✅ Regenerate button is disabled
6. ✅ No undefined response displayed
7. ✅ Translates to French and Twi
8. ✅ Resets when user logs out

## Backend Response (Already Implemented)
The backend already returns:
```json
{
  "limit_exceeded": true,
  "message": "You've reached your guest chat limit. Please log in to continue."
}
```
with HTTP 200 OK when guest limit is reached.

