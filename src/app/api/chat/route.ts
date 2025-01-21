import { ModelRegistry } from "@/lib/constants/models";
import { ModelId } from "@/types/models";
import { anthropic } from "@ai-sdk/anthropic";
import { groq } from "@ai-sdk/groq";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is not defined");
}

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not defined");
}

if (!process.env.GROQ_API_KEY) {
  throw new Error("GROQ_API_KEY is not defined");
}

export async function POST(req: Request) {
  const startTime = performance.now();

  try {
    const { messages, model } = await req.json();
    console.log(`[API] Starting request for model: ${model}`);

    const modelConfig = ModelRegistry[model as ModelId];
    if (!modelConfig) {
      return new Response(JSON.stringify({ error: "Invalid model provided." }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, must-revalidate",
        },
      });
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
      default:
        throw new Error(`Unknown provider for model ${model}`);
    }

    const modelId = modelConfig.modelId || model;

    const result = streamText({
      model: provider(modelId),
      messages,
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
