import { describe, test, expect, mock } from "bun:test";
import { createMemoryMiddleware, isMemoryEnabledForRequest } from "../lib/memory.js";
import { MEMORY_EXTRACTION_MAX_FACTS_PER_TURN } from "@faster-chat/shared";

describe("memory helpers", () => {
  test("isMemoryEnabledForRequest requires all memory gates to pass", () => {
    const dbUtils = {
      getMemoryGlobalEnabled: () => "true",
      getUserMemoryEnabled: () => true,
      getChatMemoryDisabled: () => false,
    };

    expect(
      isMemoryEnabledForRequest({ dbUtils, userId: 1, chatId: "chat-1", requestEnabled: true })
    ).toBe(true);
    expect(
      isMemoryEnabledForRequest({ dbUtils, userId: 1, chatId: "chat-1", requestEnabled: false })
    ).toBe(false);
    expect(
      isMemoryEnabledForRequest({
        dbUtils: { ...dbUtils, getMemoryGlobalEnabled: () => "false" },
        userId: 1,
        chatId: "chat-1",
        requestEnabled: true,
      })
    ).toBe(false);
    expect(
      isMemoryEnabledForRequest({
        dbUtils: { ...dbUtils, getUserMemoryEnabled: () => false },
        userId: 1,
        chatId: "chat-1",
        requestEnabled: true,
      })
    ).toBe(false);
    expect(
      isMemoryEnabledForRequest({
        dbUtils: { ...dbUtils, getChatMemoryDisabled: () => true },
        userId: 1,
        chatId: "chat-1",
        requestEnabled: true,
      })
    ).toBe(false);
  });

  test("memory middleware reads request metadata from providerOptions", async () => {
    const middleware = createMemoryMiddleware({
      getMemoryGlobalEnabled: () => "true",
      getUserMemoryEnabled: () => true,
      getChatMemoryDisabled: () => false,
      getMemoriesForUser: () => [{ fact: "uses Arch Linux" }],
    });

    const result = await middleware.transformParams({
      params: {
        system: "Base system prompt",
        providerOptions: {
          memory: { userId: 1, chatId: "chat-1", enabled: true },
        },
      },
    });

    expect(result.system).toContain("Base system prompt");
    expect(result.system).toContain("uses Arch Linux");
  });

  test("extractMemories caps persisted facts to MEMORY_EXTRACTION_MAX_FACTS_PER_TURN", async () => {
    const fiftyFacts = Array.from({ length: 50 }, (_, i) => `fact ${i}`);
    await mock.module("ai", () => ({
      wrapLanguageModel: (opts) => opts.model,
      generateText: async () => ({ text: JSON.stringify(fiftyFacts) }),
    }));

    // Re-import after mock so memory.js binds to mocked generateText
    const { extractMemories } = await import(`../lib/memory.js?cap=${Date.now()}`);

    let receivedFacts = null;
    const dbUtils = {
      upsertMemories: (_userId, facts) => {
        receivedFacts = facts;
      },
    };

    await extractMemories({
      model: {},
      userMessage: "hi",
      assistantMessage: "hello",
      userId: 1,
      chatId: "chat-1",
      dbUtils,
    });

    expect(receivedFacts).not.toBeNull();
    expect(receivedFacts.length).toBe(MEMORY_EXTRACTION_MAX_FACTS_PER_TURN);
    expect(receivedFacts.length).toBe(10);
  });

  test("memory middleware skips injection when the request disables memory", async () => {
    const middleware = createMemoryMiddleware({
      getMemoryGlobalEnabled: () => "true",
      getUserMemoryEnabled: () => true,
      getChatMemoryDisabled: () => false,
      getMemoriesForUser: () => [{ fact: "prefers Python" }],
    });

    const params = {
      system: "Base system prompt",
      providerOptions: {
        memory: { userId: 1, chatId: "chat-1", enabled: false },
      },
    };

    const result = await middleware.transformParams({ params });

    expect(result).toEqual(params);
  });
});
