import { ModelRegistry } from "@/lib/constants/models";
import { getSystemPrompt } from "@/lib/constants/prompts";
import { ModelId } from "@/types/models";
import { anthropic } from "@ai-sdk/anthropic";
import { deepseek } from "@ai-sdk/deepseek";
import { groq } from "@ai-sdk/groq";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  const startTime = performance.now();

  try {
    const { messages, model, systemPromptId }: { messages: any[]; model: ModelId; systemPromptId?: string } = await req.json();
    console.log(`[API] Starting request for model: ${model}`);

    const modelConfig = ModelRegistry[model];
    if (!modelConfig || !modelConfig.provider) {
      return new Response(JSON.stringify({ error: "Invalid model or provider configuration." }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, must-revalidate",
        },
      });
    }

    // Check for required API key based on provider
    const requiredKey = `${modelConfig.provider.toUpperCase()}_API_KEY`;
    if (!process.env[requiredKey]) {
      return new Response(
        JSON.stringify({
          error: "Configuration error",
          details: `${requiredKey} is not defined`,
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

    let provider;
    switch (modelConfig.provider) {
      case "anthropic":
        provider = anthropic;
        break;
      case "groq":
        provider = groq;
        break;
      case "openai":
        provider = openai;
        break;
      case "deepseek":
        provider = deepseek;
        break;
      default:
        throw new Error(`Unknown provider for model ${model}`);
    }

    const modelId = modelConfig.modelId || model;

    // Get system prompt and add it as the first message
    const systemPrompt = getSystemPrompt(systemPromptId || "default");
    const messagesWithSystem = [{ role: "system", content: systemPrompt.content }, ...messages];

    const result = streamText({
      model: provider(modelId),
      messages: messagesWithSystem,
    });

    const response = result.toDataStreamResponse();
    const endTime = performance.now();
    console.log(`[API] Request completed in ${endTime - startTime}ms`);

    return response;
  } catch (error) {
    const endTime = performance.now();
    console.error("Error in chat API:", error);
    console.error(`Request failed after ${endTime - startTime}ms`);

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
