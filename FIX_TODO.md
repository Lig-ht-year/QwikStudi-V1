# Fix: React Object Rendering Error in Summarize Feature

## Problem
The error `Objects are not valid as a React child` occurs because:
- OpenAI returns summary as an object with sections like `{Introduction: "...", Historical Genesis: "..."}`
- This object is rendered directly in a `<p>` tag in `MessageBubble.tsx`
- React cannot render objects as children

## Files to Fix
1. `/home/dip/Documents/Dev/GLINAX-main/gweb/gweb/chat/views.py` - `SummarizeAPIView`
2. `/home/dip/Documents/Dev/GLINAX-main/glinax-frontend/src/app/page.tsx` - `handleSummarize`
3. `/home/dip/Documents/Dev/GLINAX-main/glinax-frontend/src/components/chat/MessageBubble.tsx` - content rendering

## Plan
### 1. Backend Fix (views.py)
- In `SummarizeAPIView`, after parsing `summary_data`, check if `summary` is a dict/object
- If it is, convert it to a formatted string with section headers
- Return a clean string as `summary`

### 2. Frontend Fix (page.tsx)
- In `handleSummarize`, check if `res.data.summary` is an object
- If it is, format it into a string before setting as content

### 3. Frontend Fix (MessageBubble.tsx)
- Add a utility to safely render content
- If content is an object, format it as a string before rendering in `<p>` tag

## Status
- [ ] Fix backend SummarizeAPIView to convert object summary to string
- [ ] Fix frontend handleSummarize to handle object responses
- [ ] Fix MessageBubble.tsx to safely render content
- [ ] Test the fix

