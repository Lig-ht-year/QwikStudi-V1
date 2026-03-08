import test from "node:test";
import assert from "node:assert/strict";

import { applyMessagesToSession, getMessagesForSession, type SessionMessageState } from "./chatSessionState.ts";

type Message = {
    id: string;
    content: string;
};

test("applyMessagesToSession updates only the owning session cache when another session is active", () => {
    const state: SessionMessageState<Message> = {
        activeSessionId: "session-b",
        messages: [{ id: "live-b", content: "session b live" }],
        sessionMessages: {
            "session-a": [{ id: "a-1", content: "before" }],
            "session-b": [{ id: "b-1", content: "current" }],
        },
    };

    const nextMessages = [{ id: "a-2", content: "after" }];
    const result = applyMessagesToSession(state, "session-a", nextMessages);

    assert.deepEqual(result.messages, state.messages);
    assert.deepEqual(result.sessionMessages["session-a"], nextMessages);
    assert.deepEqual(result.sessionMessages["session-b"], state.sessionMessages["session-b"]);
});

test("applyMessagesToSession updates visible messages when the owning session is active", () => {
    const state: SessionMessageState<Message> = {
        activeSessionId: "session-a",
        messages: [{ id: "a-1", content: "before" }],
        sessionMessages: {},
    };

    const nextMessages = [{ id: "a-2", content: "after" }];
    const result = applyMessagesToSession(state, "session-a", nextMessages);

    assert.deepEqual(result.messages, nextMessages);
    assert.deepEqual(result.sessionMessages["session-a"], nextMessages);
});

test("getMessagesForSession prefers cached session messages over the active transcript", () => {
    const state: SessionMessageState<Message> = {
        activeSessionId: "session-a",
        messages: [{ id: "live", content: "visible" }],
        sessionMessages: {
            "session-a": [{ id: "cached", content: "cached value" }],
        },
    };

    assert.deepEqual(getMessagesForSession(state, "session-a"), [{ id: "cached", content: "cached value" }]);
});

test("getMessagesForSession falls back to the visible transcript for the active session", () => {
    const state: SessionMessageState<Message> = {
        activeSessionId: "session-a",
        messages: [{ id: "live", content: "visible" }],
        sessionMessages: {},
    };

    assert.deepEqual(getMessagesForSession(state, "session-a"), [{ id: "live", content: "visible" }]);
    assert.deepEqual(getMessagesForSession(state, "session-b"), []);
});
