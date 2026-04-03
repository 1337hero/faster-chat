import { tool } from "ai";
import { z } from "zod";
import { searchWeb } from "../search/index.js";

export function createWebSearchTool({ apiKey }) {
  return tool({
    description:
      "Search the web for current information. Use when the user asks about recent events, facts you're unsure about, or anything that needs up-to-date information.",
    parameters: z.object({
      query: z.string().min(1).max(200).describe("The search query"),
    }),
    execute: async ({ query }) => {
      const results = await searchWeb(query, { apiKey });
      if (results.error) {
        return { error: results.error, code: results.code, results: [] };
      }
      if (results.length === 0) {
        return { results: [], message: "No results found. Try a different query." };
      }
      return {
        results: results.map((r) => ({
          title: r.title,
          url: r.url,
          snippet: r.snippet,
          domain: r.domain,
        })),
      };
    },
  });
}
