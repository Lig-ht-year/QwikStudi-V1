<<<<<<< HEAD
# Glinax Prime Web – README

## 📌 Overview

**Glinax Prime Web** is a modular Django + DRF-based AI platform enabling document uploads, chat-based AI interactions, file summarization, audio processing, question generation, and payment-controlled access to premium features. The system provides user collaboration, file handling, and AI-powered content generation directly via a web interface.

---

## 🔑 Core Features

* Authentication & user management
* AI chat interaction (guest & registered users)
* File upload, summary, and question generation
* Audio generation (Text-to-Speech) and transcription
* Collaborator sharing & management for chats
* Premium feature gating via Paystack payment integration
* Clean, responsive frontend UI (React/Next.js assumed)

---

## 📦 Modular Structure (Proposed)

* `g_auth/`: Handles authentication APIs
* `chat/`: Manages chat sessions, AI communication, collaborators
* `files/`: File upload, storage, summarization, questions or anything concerning files
* `payments/`: Paystack payment handling

---

## 🔧 API ENDPOINTS (UPDATED)

### 🔐 AUTHENTICATION

| Method | Endpoint            | Description            |
| ------ | ------------------- | ---------------------- |
| POST   | /api/auth/register/ | Register new user      |
| POST   | /api/auth/login/    | Login + token issuance |
| POST   | /api/auth/refresh/  | Refresh access token   |
| POST   | /api/auth/logout/   | Log out client-side    |
| GET    | /api/auth/me/       | Get current user info  |

### 💬 CHAT INTERACTIONS

| Method | Endpoint                                   | Description                  |
| ------ | ------------------------------------------ | ---------------------------- |
| POST   | /api/chat/                                 | Send message to AI           |
| POST   | /api/chat/commit/                          | Save chat after 2+ responses |
| GET    | /api/chat/list/                            | Fetch user’s saved chats     |
| GET    | /api/chat/{chat\_id}/messages/             | Get full chat history        |
| PATCH  | /api/chat/{chat\_id}/                      | Rename chat                  |
| DELETE | /api/chat/{chat\_id}/                      | Soft-delete chat             |
| POST   | /api/chat/start/                           | Start a new chat             |
| POST   | /api/chat/{chat\_id}/share/                | Share chat via email         |
| POST   | /api/chat/{chat\_id}/collaborators/add/    | Add collaborators            |
| POST   | /api/chat/{chat\_id}/collaborators/remove/ | Remove collaborators         |

### 📂 FILE MANAGEMENT

| Method | Endpoint         | Description          |
| ------ | ---------------- | -------------------- |
| POST   | /api/files/      | Upload file          |
| GET    | /api/files/      | List uploaded files  |
| DELETE | /api/files/{id}/ | Delete specific file |

### 🔊 AUDIO PROCESSING

| Method | Endpoint               | Description                |
| ------ | ---------------------- | -------------------------- |
| POST   | /api/audio/generate/   | Convert text/file to audio |
| GET    | /api/audio/            | List generated audio       |
| POST   | /api/audio/transcribe/ | Transcribe uploaded audio  |

### 🧠 FILE CONTENT PROCESSING

| Method | Endpoint                 | Description              |
| ------ | ------------------------ | ------------------------ |
| POST   | /api/files/summary/      | Summarize document       |
| POST   | /api/questions/generate/ | Generate questions       |
| GET    | /api/questions/          | List generated questions |

### 📈 USAGE LOGS (Optional)

| Method | Endpoint    | Description        |
| ------ | ----------- | ------------------ |
| GET    | /api/usage/ | View usage history |

### 💳 PAYMENT

| Method | Endpoint                 | Description               |
| ------ | ------------------------ | ------------------------- |
| POST   | /api/payment/initialize/ | Start Paystack session    |
| GET    | /api/payment/status/     | Check user payment status |
| POST   | /api/payment/webhook/    | Handle Paystack webhook   |

---

## 🚀 USER FLOW (UPDATED)

### 🟢 Guest Session

* Guest session starts automatically
* `guest_id` stored locally
* Limited to 5 AI messages via `/api/chat/`
* After 2 responses: `/api/chat/commit/` saves chat with auto-title
* Prompt to log in after limit reached

### 👤 Registered Users

* Full token-based access to all APIs
* Auth tokens stored locally
* Sidebar loads chats via `/api/chat/list/`
* Collaboration, file uploads, and premium features unlocked post-payment

### 🧠 AI Features (Premium Controlled)

* File uploads, TTS, transcription, summarization, question generation restricted until payment is confirmed via `/api/payment/status/`

### 📊 Collaboration & Sharing

* Chats shareable via email/username
* Collaborator permissions: view/edit
* Invites, removals, and UI controls follow owner-only restrictions
* APIs enforce strict access control with 403 responses when necessary

---

## 📐 Database Models Overview

1. **User / UserProfile**: Payment & profile tracking.
2. **File**: Uploaded files with metadata.
3. **Audio**: Audio files (TTS/transcription).
4. **Transcription**: Text from transcribed audio.
5. **ChatHistory**: Message-level chat logs.
6. **Chat**: Overall chat sessions.
7. **ChatCollaborator**: Shared chat access.
8. **GeneratedQuestion**: AI-generated questions (MCQs/Theory).
9. **UsageLog (Optional)**: Tracks user actions.
10. **UserPayment**: Payment tracking.

---

## 📋 Frontend UX Considerations

* **Questions:** Render MCQs with checkboxes; theory with textareas.
* **Answers:** Support submission, score calculation, and storage in localStorage.
* **Visuals:** Render images properly inside chat.
* **Input Field:**

  * Auto-grow to 5 lines max.
  * Rounded design with icon-button submit inside field.
  * Loading indicator/spinner on submit.
  * Sidebar collapsible in mobile view.
  * Display AI response indicator (typing.../responding...).
* **Post-Question Flow:**

  * Question panel disappears after submission.
  * Scores displayed and stored.
  * Button in inventory to reopen question section.
  * Inventory includes file download buttons.
  * Custom spinners for loaders.

---

## ⚙️ Deployment Requirements

* Django 5.x
* Python ≥ 3.11
* PostgreSQL
* Cloud storage or local FileField setup
* Paystack credentials via environment variables
* CORS setup for frontend
* Gunicorn / systemd for backend serving

---

## 📈 Final Notes for Developers

* All premium checks tied strictly to `has_paid` status in `UserProfile`.
* Guests have fully separate chat flows (session-based).
* Maintain modularization for each feature area.
* Enforce strict permission controls in APIs.
* Use DRF ViewSets/serializers for consistency.
* Optimize file upload processing and audio generation.
* Ensure accurate frontend rendering with state management and responsive UI.

---

**End of README**
=======
# GLINAX
An AI powered study tool
>>>>>>> 17846a160c8bd29d05b54167e0f0972e28a64f91
