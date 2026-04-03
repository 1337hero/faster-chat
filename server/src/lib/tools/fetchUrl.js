import { tool } from "ai";
import { z } from "zod";
import { fetchAndExtract } from "../search/fetchUrl.js";

export function createFetchUrlTool() {
  return tool({
    description:
      "Fetch and read the content of a specific URL. Use when the user shares a link or when you need to read a specific web page from search results.",
    parameters: z.object({
      url: z.string().url().describe("The URL to fetch"),
    }),
    execute: async ({ url }) => {
      const result = await fetchAndExtract(url);
      if (result.error) {
        return { error: result.error, code: result.code };
      }
      return {
        ...result,
        ...(result.truncated && {
          note: `Content truncated from ${result.contentLength} to ${result.content.length} characters. Key information may be missing.`,
        }),
      };
    },
  });
}
