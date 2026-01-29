import api from "@/lib/api";

export const getChatMessages = async (chatId: number): Promise<{
  data: { id: number; chat: number; prompt: string; response: string; created_at: string }[];
  error: string | null;
}> => {
  try {
    const res = await api.get(`/chat/messages/${chatId}/`);
    return { data: res.data, error: null };
  } catch (err: any) {
    const message =
      err.response?.status === 401
        ? "Unauthorized"
        : err.response?.data?.error || "Failed to load chat messages.";
    return { data: [], error: message };
  }
};

