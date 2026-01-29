// src/lib/startNewChat.ts
import api from "@/lib/api";

export const startNewChat = async () => {
  const res = await api.post("/chat/start/");
  return res.data; // { chat_id, title }
};
