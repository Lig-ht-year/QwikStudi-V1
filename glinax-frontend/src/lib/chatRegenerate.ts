export type RegenerateMessage = {
    id: string;
    role: "user" | "assistant";
};

export function getLatestAssistantMessageId(messages: RegenerateMessage[]): string | null {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
        if (messages[index]?.role === "assistant") {
            return messages[index].id;
        }
    }
    return null;
}

export function canRegenerateMessage(messages: RegenerateMessage[], assistantMessageId: string): boolean {
    return getLatestAssistantMessageId(messages) === assistantMessageId;
}
