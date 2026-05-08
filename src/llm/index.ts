import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("Warning: GEMINI_API_KEY is not set in the environment.");
}

export const ai = new GoogleGenAI({
  apiKey,
  vertexai: false,
  httpOptions: {
    baseUrl: "https://generativelanguage.googleapis.com",
  },
});

export const MODELS = {
  REFINER: "gemini-2.5-flash",
  CRITIC: "gemini-2.5-pro",
  GENERATOR: "gemini-3.1-pro-preview",
  EVALUATOR: "gemini-3.1-flash-lite-preview",
} as const;

const MAX_API_RETRIES = 3;
const BASE_DELAY_MS = 2000;

/**
 * Utility to generate a completion with a specific model.
 * Retries transient API errors (503, 429) with exponential backoff.
 */
export async function generateContent(
  model: typeof MODELS[keyof typeof MODELS],
  prompt: string,
  systemInstruction?: string,
  temperature = 0.1
) {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_API_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: systemInstruction ?? undefined,
          temperature,
        },
      });

      if (!response.text) {
        throw new Error("LLM response missing text content");
      }

      return response.text;
    } catch (err: any) {
      lastError = err;
      const status = err?.status ?? err?.code;
      const isRetryable = status === 503 || status === 429;

      if (isRetryable && attempt < MAX_API_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(`API returned ${status}, retrying in ${delay / 1000}s (${attempt + 1}/${MAX_API_RETRIES})...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      throw err;
    }
  }

  throw lastError;
}

/**
 * Web-grounded source of provenance returned by Gemini Search Grounding.
 */
export interface GroundingSource {
  /** Page title, when supplied by the search result. */
  title?: string;
  /** Resolvable URL, when supplied. */
  uri?: string;
}

export interface GroundedResponse {
  /** The model's textual answer. */
  text: string;
  /** Sources cited via grounding metadata; empty if grounding produced none. */
  sources: GroundingSource[];
}

/**
 * Generate a completion with Google Search grounding enabled.
 *
 * Used by the auto-research workflow so the model can verify factual claims
 * against the live web and return real source URLs alongside its answer. The
 * retry behavior matches `generateContent`. Returns both the answer text and
 * the grounding sources extracted from `groundingMetadata.groundingChunks`.
 *
 * If grounding produces no sources (e.g., the model answered from training
 * data without invoking search), `sources` is an empty array — callers can
 * still use the text but should treat the result as unsourced.
 */
export async function generateGroundedContent(
  model: typeof MODELS[keyof typeof MODELS],
  prompt: string,
  systemInstruction?: string,
  temperature = 0.1
): Promise<GroundedResponse> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_API_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: systemInstruction ?? undefined,
          temperature,
          // Enable Google Search grounding. The SDK accepts `{googleSearch: {}}`
          // entries inside the `tools` array.
          tools: [{ googleSearch: {} }],
        },
      });

      if (!response.text) {
        throw new Error("LLM response missing text content");
      }

      const sources: GroundingSource[] = [];
      const chunks =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      for (const chunk of chunks) {
        const web = (chunk as any).web;
        if (web && (web.title || web.uri)) {
          sources.push({ title: web.title, uri: web.uri });
        }
      }

      return { text: response.text, sources };
    } catch (err: any) {
      lastError = err;
      const status = err?.status ?? err?.code;
      const isRetryable = status === 503 || status === 429;

      if (isRetryable && attempt < MAX_API_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(`API (grounded) returned ${status}, retrying in ${delay / 1000}s (${attempt + 1}/${MAX_API_RETRIES})...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      throw err;
    }
  }

  throw lastError;
}
