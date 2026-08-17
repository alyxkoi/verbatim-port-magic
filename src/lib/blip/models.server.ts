// The four Blip calls (reference 4.1). Separate models, separate temperatures,
// separate failure modes. All four return JSON only — never free text, and the
// result is never regexed out of prose. One reparse attempt, then hold.

import { generateText } from "ai";

import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

export const BLIP_MODELS = {
  /** Terra: the writing model. Reply and Plan prose. */
  terra: "google/gemini-3.6-flash",
  /** Luna: the reading model. Extract and Tag struggles, temperature zero. */
  luna: "google/gemini-2.5-flash-lite",
} as const;

export type BlipJob = "reply" | "extract" | "tag" | "plan";

export const BLIP_JOB_CONFIG: Record<BlipJob, { model: keyof typeof BLIP_MODELS; temperature: number }> = {
  reply: { model: "terra", temperature: 0.75 },
  extract: { model: "luna", temperature: 0 },
  tag: { model: "luna", temperature: 0 },
  plan: { model: "terra", temperature: 0.6 },
};

export class BlipGenerationError extends Error {
  constructor(
    message: string,
    readonly kind: "gateway" | "malformed_json" | "missing_key",
    readonly status?: number,
  ) {
    super(message);
    this.name = "BlipGenerationError";
  }
}

function statusOf(error: unknown) {
  const candidate = error as { statusCode?: number; status?: number; responseBody?: string };
  return candidate?.statusCode ?? candidate?.status;
}

function stripFence(text: string) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed.replace(/^```[a-z]*\s*/i, "").replace(/```$/, "").trim();
}

/**
 * One model call that must return a JSON object. `json` is named in the prompt
 * because json_object mode requires it.
 */
export async function callBlipJson<T>(options: {
  job: BlipJob;
  system: string;
  user: string;
}): Promise<{ data: T; raw: string; model: string; temperature: number }> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new BlipGenerationError("Missing LOVABLE_API_KEY", "missing_key");

  const { model: modelKey, temperature } = BLIP_JOB_CONFIG[options.job];
  const modelId = BLIP_MODELS[modelKey];
  const gateway = createLovableAiGatewayProvider(apiKey);

  const ask = async (system: string, user: string, temp: number) => {
    try {
      const result = await generateText({
        model: gateway(modelId),
        system,
        prompt: user,
        temperature: temp,
        maxRetries: 1,
        providerOptions: { lovable: { response_format: { type: "json_object" } } },
      });
      return result.text ?? "";
    } catch (error) {
      const status = statusOf(error);
      throw new BlipGenerationError(
        `Lovable AI request failed${status ? ` (${status})` : ""}: ${(error as Error).message}`,
        "gateway",
        status,
      );
    }
  };

  const first = await ask(options.system, `${options.user}\n\nreturn json only.`, temperature);
  const parse = (text: string) => JSON.parse(stripFence(text)) as T;

  try {
    return { data: parse(first), raw: first, model: modelId, temperature };
  } catch {
    // One reparse attempt, at temperature zero, then hold.
    const repaired = await ask(
      "You convert text into valid JSON. Return the same content as a single valid json object and nothing else.",
      first,
      0,
    );
    try {
      return { data: parse(repaired), raw: repaired, model: modelId, temperature };
    } catch {
      throw new BlipGenerationError(
        `${options.job} returned malformed JSON twice`,
        "malformed_json",
      );
    }
  }
}
