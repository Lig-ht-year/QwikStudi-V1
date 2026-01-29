// src/lib/getChatHistory.ts
import api from "@/lib/api";

export const getChatHistory = async (): Promise<{
  data: { id: number; title: string }[];
  error: string | null;
}> => {
  try {
    const res = await api.get("/chat/list/");
    return { data: res.data, error: null };
  } catch (err: any) {
    const message =
      err.response?.status === 401
        ? "Unauthorized"
        : err.response?.data?.error || "Something went wrong.";
    return { data: [], error: message };
  }
};
