type StreamPayload = {
  prompt: string;
  guest_id?: string;
  chat_id?: number | null;
  response_style: "concise" | "balanced" | "detailed";
  study_methods?: string[];
  study_custom_prompt?: string;
  files?: File[];
};

type StreamHandlers = {
  onMeta?: (payload: Record<string, unknown>) => void;
  onDelta?: (delta: string) => void;
  onFinal?: (text: string) => void;
};

export type StreamDonePayload = {
  chat_id: number | null;
  response: string;
  chat_title?: string | null;
  limit_exceeded?: boolean;
  message?: string;
  guest_id?: string;
  uploaded_files?: unknown[];
};

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const apiBaseUrl = rawApiUrl.replace(/\/+$/, "").replace(/\/chat$/, "");

function buildBody(payload: StreamPayload): FormData | string {
  const hasFiles = Array.isArray(payload.files) && payload.files.length > 0;
  if (!hasFiles) {
    return JSON.stringify({
      prompt: payload.prompt,
      guest_id: payload.guest_id,
      chat_id: payload.chat_id,
      response_style: payload.response_style,
      study_methods: payload.study_methods || [],
      study_custom_prompt: payload.study_custom_prompt || "",
    });
  }

  const formData = new FormData();
  formData.append("prompt", payload.prompt);
  if (payload.guest_id) formData.append("guest_id", payload.guest_id);
  if (payload.chat_id) formData.append("chat_id", String(payload.chat_id));
  formData.append("response_style", payload.response_style);
  formData.append("study_methods", JSON.stringify(payload.study_methods || []));
  formData.append("study_custom_prompt", payload.study_custom_prompt || "");
  payload.files?.forEach((file) => formData.append("files", file));
  return formData;
}

function parseEventBlock(block: string): Record<string, unknown> | null {
  const dataLines = block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim());
  if (dataLines.length === 0) return null;

  const joined = dataLines.join("\n");
  try {
    return JSON.parse(joined) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function streamChat(
  payload: StreamPayload,
  handlers: StreamHandlers
): Promise<StreamDonePayload> {
  const access = typeof window !== "undefined" ? localStorage.getItem("access") : null;
  const body = buildBody(payload);
  const headers: Record<string, string> = {
    Accept: "text/event-stream, application/json",
  };
  if (typeof body === "string") {
    headers["Content-Type"] = "application/json";
  }
  if (access) headers.Authorization = `Bearer ${access}`;

  const response = await fetch(`${apiBaseUrl}/chat/stream/`, {
    method: "POST",
    headers,
    body,
  });

  if (!response.ok) {
    let message = "Sorry, I couldn't process your request. Please try again.";
    try {
      const data = (await response.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      // Ignore parse errors and use fallback.
    }
    throw new Error(message);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/event-stream")) {
    const data = (await response.json()) as StreamDonePayload;
    return data;
  }

  if (!response.body) {
    throw new Error("Streaming response is not available in this browser.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let donePayload: StreamDonePayload | null = null;
  let accumulatedResponse = "";
  let latestMeta: Record<string, unknown> | null = null;

  const processPayload = (payloadObj: Record<string, unknown>) => {
    const eventType = typeof payloadObj.type === "string" ? payloadObj.type : "";
    if (eventType === "meta") {
      latestMeta = payloadObj;
      handlers.onMeta?.(payloadObj);
      return;
    }
    if (eventType === "delta") {
      const delta = typeof payloadObj.delta === "string" ? payloadObj.delta : "";
      if (delta) {
        accumulatedResponse += delta;
        handlers.onDelta?.(delta);
      }
      return;
    }
    if (eventType === "final") {
      const text = typeof payloadObj.response === "string" ? payloadObj.response : "";
      if (text) accumulatedResponse = text;
      handlers.onFinal?.(text);
      return;
    }
    if (eventType === "error") {
      const errorMessage =
        typeof payloadObj.error === "string"
          ? payloadObj.error
          : "Sorry, I couldn't process your request. Please try again.";
      throw new Error(errorMessage);
    }
    if (eventType === "done") {
      donePayload = payloadObj as unknown as StreamDonePayload;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";

    for (const block of blocks) {
      const payloadObj = parseEventBlock(block);
      if (!payloadObj) continue;
      processPayload(payloadObj);
    }
  }

  if (donePayload) return donePayload;

  // Some proxies close SSE streams without a final \n\n delimiter.
  const trailingPayload = buffer.trim() ? parseEventBlock(buffer) : null;
  if (trailingPayload) {
    processPayload(trailingPayload);
  }

  if (donePayload) return donePayload;

  if (accumulatedResponse) {
    return {
      chat_id: typeof latestMeta?.chat_id === "number" ? latestMeta.chat_id : null,
      response: accumulatedResponse,
      guest_id: typeof latestMeta?.guest_id === "string" ? latestMeta.guest_id : undefined,
    };
  }

  throw new Error("Stream ended unexpectedly. Please try again.");
}
