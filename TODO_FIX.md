# Fix Chat Buttons: Regenerate, Summarize, Generate Quiz

## Analysis
- **dataStore.ts**: Already has `selectedContent` and `setSelectedContent`
- **MessageBubble.tsx**: Already sets `selectedContent` when buttons clicked
- **ChatContainer.tsx**: Already has `handleRegenerate` that re-calls API
- **SummarizeModal.tsx**: Already uses `selectedContent`
- **QuizConfigModal.tsx**: Needs update to support text from `selectedContent`

## Plan
- [ ] Update QuizConfigModal.tsx to support text mode when `selectedContent` is available
  - Import `useDataStore` and get `selectedContent`
  - Add text mode UI similar to SummarizeModal
  - Update `handleGenerate` to create virtual file from `selectedContent`
  - Clear `selectedContent` when modal closes
  - Update header and content based on mode

## Testing
- [ ] Test Regenerate button: Should re-call API and replace last AI response
- [ ] Test Summarize button: Should open modal with selected content
- [ ] Test Generate Quiz button: Should open modal with selected content
