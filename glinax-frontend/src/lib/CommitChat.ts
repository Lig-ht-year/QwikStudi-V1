// src/lib/commitChat.ts
import api from "@/lib/api";

export const commitChat = async (
  chatId: number,
  messages: { prompt: string; response: string }[]
) => {
  const formattedMessages = messages.flatMap(msg => ([
    { role: "user", content: msg.prompt },
    { role: "assistant", content: msg.response }
  ]));

  try {
    const res = await api.post("/chat/commit/", {
      chat_id: chatId,
      messages: formattedMessages,
    });

    return res.data; // Should contain { title: string }
  } catch (err: any) {
    console.error("Chat commit failed:", err.response?.data || err.message);
    throw new Error("Commit failed");
  }
};
