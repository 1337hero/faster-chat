import { describe, test, expect } from "bun:test";
import { createMemoryMiddleware, isMemoryEnabledForRequest } from "../lib/memory.js";

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
