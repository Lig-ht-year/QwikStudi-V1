# TODO: Fix "Objects are not valid as a React child" Error

## Issue
When AI returns structured summaries with section titles as keys (e.g., `{"Introduction": "...", "Historical Genesis": "...", ...}`), this object is being passed directly to the `SummaryCard` component which expects a string.

## Root Cause
The `SummarizeAPIView` in `views.py` sometimes returns structured content that gets passed to the frontend as an object. The `SummaryCard` component doesn't handle this case.

## Plan
1. **Update `MessageBubble.tsx`**: Enhance `formatContentForDisplay` to handle objects with section keys
2. **Update `SummaryCard.tsx`**: Add safety check to convert object summaries to strings

## Files to Edit
- `glinax-frontend/src/components/chat/MessageBubble.tsx`
- `glinax-frontend/src/components/cards/SummaryCard.tsx`

## Status
- [ ] 1. Fix formatContentForDisplay in MessageBubble.tsx
- [ ] 2. Add safety check in SummaryCard.tsx for summary prop

