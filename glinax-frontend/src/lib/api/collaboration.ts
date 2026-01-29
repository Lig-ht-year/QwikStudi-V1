import api from "@/lib/api";

export type Collaborator = {
  id: number;
  chat: number;
  collaborator: {
    id: number;
    username: string;
    email: string;
  };
  added_by: {
    id: number;
    username: string;
    email: string;
  };
  access_level: "view" | "edit";
  is_approved: boolean;
  added_at: string;
  is_owner: boolean;
};

// 🔍 Search and get all users by query
export const getUsers = async (query = "") => {
  const res = await api.get(`/chat/users/?q=${encodeURIComponent(query)}`);
  return res.data;
};

// 🤝 Share chat with multiple users by user IDs
export const shareWithUsers = async (
  chatId: number,
  userIds: number[],
  accessLevel: "view" | "edit"
) => {
  return api.post(`/chat/${chatId}/collaborators/add/`, {
    user_ids: userIds,
    access_level: accessLevel,
  });
};

// ✉️ Share chat with one user via email
export const shareWithEmail = async (
  chatId: number,
  email: string,
  accessLevel: "view" | "edit"
) => {
  return api.post(`/chat/${chatId}/share/email/`, {
    email,
    access_level: accessLevel,
  });
};

// 👥 Get all collaborators for a given chat
export const getCollaborators = async (
  chatId: number
): Promise<Collaborator[]> => {
  const res = await api.get(`/chat/${chatId}/collaborators/`);
  return res.data;
};

// ❌ Remove a collaborator by username
export const removeCollaborator = async (
  chatId: number,
  username: string
) => {
  return api.post(`/chat/${chatId}/collaborators/remove/`, {
    username,
  });
};

// ⏳ List all pending collaborations for current user
export const getPendingCollaborations = async () => {
  const res = await api.get(`/chat/collaborators/pending/`);
  return res.data;
};

export const approveCollaboration = async (chatId: number) => {
  return await api.post(`/chat/${chatId}/collaborators/approve/`);
};

export const rejectCollaboration = async (chatId: number) => {
  return await api.post(`/chat/${chatId}/collaborators/reject/`);
};

