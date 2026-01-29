# Chat Loading Fix TODO

## Task: Fix previous chats showing with same labels and not loading messages when tapped

### Frontend Changes

- [x] 1. Modify ChatSession interface to include chatId (backend id)
- [x] 2. Add loadChatHistory function to dataStore
- [x] 3. Update session selection in Sidebar to set both activeSessionId and chatId
- [x] 4. Load chat history on login in login page

### Backend Changes (if needed)

- [ ] 5. Verify backend returns proper chat titles (not all "New Study Session")
- [ ] 6. Test chat loading functionality

### Testing

- [ ] 7. Test that previous chats load messages when selected
- [ ] 8. Verify chat titles are unique and descriptive
