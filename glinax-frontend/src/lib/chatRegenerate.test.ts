import test from "node:test";
import assert from "node:assert/strict";

import { canRegenerateMessage, getLatestAssistantMessageId, type RegenerateMessage } from "./chatRegenerate.ts";

test("getLatestAssistantMessageId returns the last assistant turn in a mixed transcript", () => {
    const messages: RegenerateMessage[] = [
        { id: "u-1", role: "user" },
        { id: "a-1", role: "assistant" },
        { id: "u-2", role: "user" },
        { id: "a-2", role: "assistant" },
    ];

    assert.equal(getLatestAssistantMessageId(messages), "a-2");
});

test("getLatestAssistantMessageId returns null when there is no assistant turn", () => {
    const messages: RegenerateMessage[] = [{ id: "u-1", role: "user" }];
    assert.equal(getLatestAssistantMessageId(messages), null);
});

test("canRegenerateMessage only allows the latest assistant turn", () => {
    const messages: RegenerateMessage[] = [
        { id: "u-1", role: "user" },
        { id: "a-1", role: "assistant" },
        { id: "u-2", role: "user" },
        { id: "a-2", role: "assistant" },
    ];

    assert.equal(canRegenerateMessage(messages, "a-2"), true);
    assert.equal(canRegenerateMessage(messages, "a-1"), false);
});
