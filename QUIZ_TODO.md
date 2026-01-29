# Quiz Fix & Enhancement TODO

## Issue Summary
1. Quiz questions not displaying in chat UI (metadata prop missing)
2. Enhance quiz with more interactive features

## Tasks

### Task 1: Fix ChatContainer - Add metadata prop to MessageBubble
- [x] Open `glinax-frontend/src/components/chat/ChatContainer.tsx`
- [x] Find the MessageBubble component usage inside the messages.map
- [x] Add `metadata={message.metadata}` prop
- [x] This fixes the core issue of quiz not displaying

### Task 2: Enhance QuizWidgetCard with better interactivity
- [x] Open `glinax-frontend/src/components/cards/QuizWidgetCard.tsx`
- [x] Add progress bar at top showing completion percentage
- [x] Show explanation after each answer is revealed
- [x] Add review mode to retry incorrect questions
- [x] Add score breakdown (correct/incorrect by category)

### Task 3: Test the fix
- [x] Run the frontend development server
- [x] Generate a quiz from a study file
- [x] Verify quiz questions display in chat
- [x] Test interactive features work correctly

## Changes Made

### 1. ChatContainer.tsx - Fixed metadata prop
Added `metadata={message.metadata}` to MessageBubble component to pass quiz questions data.

### 2. QuizWidgetCard.tsx - Enhanced interactivity
- Progress bar showing completion percentage
- Visual score breakdown (correct/incorrect/missed)
- Animated circular score display on completion
- Review mode for incorrect answers
- Question navigator with color-coded status
- Explanation reveal after each answer
- Try Again and Replay options
- Performance rating based on score

## Implementation Details

### ChatContainer.tsx Change
```tsx
// Before:
<MessageBubble
    key={message.id}
    role={message.role}
    content={message.content}
    timestamp={message.timestamp}
    type={message.type}
/>

// After:
<MessageBubble
    key={message.id}
    role={message.role}
    content={message.content}
    timestamp={message.timestamp}
    type={message.type}
    metadata={message.metadata}  // <-- ADD THIS
/>
```

### QuizWidgetCard Enhancements
- Progress bar showing current question / total
- Explanation reveal after answering
- Review incorrect answers option
- Score breakdown chart

