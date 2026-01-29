# Chat Improvements TODO

## Task: Improve AI responses with conversation history and enhanced system prompt

### Backend Changes (gweb/gweb/chat/views.py)

- [x] 1. Enhanced System Prompt for Study Buddy Behavior
- [x] 2. Increase conversation history from 10 to 20 messages
- [x] 3. Add message truncation for token optimization
- [x] 4. Implement response style settings (temperature, max_tokens)

### Frontend Changes

- [x] 5. Load chat messages when session is selected (ChatContainer.tsx)
- [x] 6. Handle session switching to load different chat histories

### Testing

- [ ] 7. Test conversation continuity across messages
- [ ] 8. Verify response style affects AI output

