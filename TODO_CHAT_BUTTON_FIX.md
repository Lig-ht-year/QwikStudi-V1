# TODO: Fix Chat Button Functionality

## Issue Summary
The buttons "Regenerate", "Summarize this response", and "Generate quiz from this" don't work because:
- Regenerate: Calls onRegenerate callback that isn't passed to MessageBubble
- Summarize this / Generate Quiz: Opens modals but doesn't pass the message content to them

## Plan

### Step 1: Add selectedContent state to dataStore.ts
- Add `selectedContent` state to store message content when buttons are clicked
- Add setter functions for the content

### Step 2: Update MessageBubble.tsx
- Store content in dataStore when "Summarize This" button is clicked
- Store content in dataStore when "Generate Quiz" button is clicked

### Step 3: Update ChatContainer.tsx
- Implement regenerate functionality that re-calls the API
- Pass `onRegenerate` callback to MessageBubble

### Step 4: Update SummarizeModal.tsx
- Accept optional `content` prop
- When content is provided, use it directly without file upload

### Step 5: Update QuizConfigModal.tsx
- Accept optional `content` prop
- When content is provided, use it directly without file upload

## Status
- [x] Step 1: Add selectedContent state to dataStore.ts
- [x] Step 2: Update MessageBubble.tsx to store content
- [x] Step 3: Update ChatContainer.tsx for regenerate functionality
- [x] Step 4: Update SummarizeModal.tsx for content-based generation
- [x] Step 5: Update QuizConfigModal.tsx for content-based generation

