import { ModelRegistry } from "@/lib/constants/models";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const { messages, model } = await req.json();

    // Validate early to fail fast
    if (!(model in ModelRegistry)) {
      return new Response(
        JSON.stringify({ error: "Invalid model provided." }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store, must-revalidate",
          },
        }
      );
    }

    const provider = model.startsWith("claude") ? anthropic : openai;
    const result = streamText({
      model: provider(model),
      messages,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Error in chat API:", error);
    return new Response(
      JSON.stringify({
        error: "An error occurred during the request.",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
