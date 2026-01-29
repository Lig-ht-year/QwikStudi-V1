# Quiz Widget Answer Input Fix

## Task
Add answer input UI for "Fill in the Blank" and "Essay Questions" in the QuizWidgetCard component.

## Implementation Plan

### Step 1: Update QuizWidgetCard.tsx
- [x] Extend Question interface to support `type` field
- [x] Add state for text input answers (fill-in-the-blank)
- [x] Add state for textarea answers (essay questions)
- [x] Add input UI rendering for non-multiple-choice questions
- [x] Update answer handling logic
- [x] Export Question and QuestionType for use in other components

### Step 2: Update MessageBubble.tsx
- [x] Import Question type
- [x] Pass quizType prop to QuizWidgetCard

### Step 3: Fix Guest Chat guest_id Format
- [x] Add UUID format validation in ChatInput.tsx
- [x] Regenerate invalid guest_id (e.g., old nanoid format)

## Files Modified
- `glinax-frontend/src/components/cards/QuizWidgetCard.tsx`
- `glinax-frontend/src/components/chat/MessageBubble.tsx`
- `glinax-frontend/src/components/chat/ChatInput.tsx`

## Summary of Changes

### QuizWidgetCard.tsx:
1. Added `QuestionType` type ('mcq' | 'tf' | 'fill' | 'essay')
2. Exported `Question` interface with optional `type` and `correctText` fields
3. Added `quizType` prop to component
4. Added `textAnswer` state for text input
5. Added `userTextAnswers` Map for tracking text answers
6. Added `getQuestionType()` helper function
7. Added `handleTextAnswerSubmit()` function
8. Added input UI (text input for fill-in-blank, textarea for essay)
9. Updated reset/next/goToQuestion functions to clear text answer

### MessageBubble.tsx:
1. Imported `Question` type from QuizWidgetCard
2. Cast metadata.questions to `Question[]`
3. Passed `quizType` prop to QuizWidgetCard

### ChatInput.tsx:
1. Added UUID format validation regex
2. Regenerate guest_id if it's not a valid UUID format (e.g., old nanoid format)

