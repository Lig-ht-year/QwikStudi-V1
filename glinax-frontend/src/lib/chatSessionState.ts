export type SessionMessageState<Message> = {
    activeSessionId: string | null;
    messages: Message[];
    sessionMessages: Record<string, Message[]>;
};

export function getMessagesForSession<Message>(
    state: SessionMessageState<Message>,
    sessionId: string
): Message[] {
    return state.sessionMessages[sessionId] ?? (state.activeSessionId === sessionId ? state.messages : []);
}

export function applyMessagesToSession<Message>(
    state: SessionMessageState<Message>,
    sessionId: string,
    messages: Message[]
) {
    return {
        messages: state.activeSessionId === sessionId ? messages : state.messages,
        sessionMessages: {
            ...state.sessionMessages,
            [sessionId]: messages,
        },
    };
}
