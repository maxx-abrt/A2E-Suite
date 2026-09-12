import { ConvexError } from "convex/values"

/**
 * BILAN — AI layer (Google Gemini).
 *
 * Two transports, same model family, chosen at runtime:
 *   1. Google AI Studio (Generative Language API) with `GEMINI_API_KEY` — the
 *      primary path, native `responseSchema` structured output.
 *   2. The Emergent universal-key gateway (OpenAI-compatible) with
 *      `EMERGENT_LLM_KEY`, model `gemini/<model>` — used when the AI Studio key
 *      is unavailable or its Google project is not authorised.
 *
 * Both return the SAME parsed JSON, so callers never branch.
 *
 * COST + LATENCY: "thinking" is switched OFF on both transports
 * (`thinkingBudget: 0` / `reasoning_effort: "none"`). These are extraction and
 * ranking tasks over a closed candidate list — chain-of-thought adds tokens and
 * seconds without adding accuracy, and it used to consume the whole output
 * budget. Temperature is 0.1 and the output is schema-constrained, which is what
 * keeps the model from inventing an aid that is not in the list.
 */

export type JsonSchema = Record<string, unknown>

export interface AiResult<T> {
  data: T
  model: string
  provider: "ai-studio" | "emergent"
  tokens: number
}

const AI_STUDIO = "https://generativelanguage.googleapis.com/v1beta/models"
const EMERGENT = "https://integrations.emergentagent.com/llm/v1/chat/completions"

export function geminiModel(): string {
  return process.env.GEMINI_MODEL || "gemini-2.5-flash"
}

/** Deterministic cache key material. */
export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

function extractJson(text: string): unknown {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const start = trimmed.indexOf("{")
    const end = trimmed.lastIndexOf("}")
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1))
    throw new Error(`model returned non-JSON (${trimmed.slice(0, 80)})`)
  }
}

async function viaAiStudio<T>(
  system: string,
  user: string,
  schema: JsonSchema,
  maxOutputTokens: number,
): Promise<AiResult<T>> {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error("GEMINI_API_KEY missing")
  const model = geminiModel()
  const response = await fetch(`${AI_STUDIO}/${model}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        maxOutputTokens,
        responseMimeType: "application/json",
        responseSchema: schema,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  })
  const body = await response.json()
  if (!response.ok) {
    throw new Error(
      `ai-studio ${response.status}: ${body?.error?.message ?? JSON.stringify(body).slice(0, 160)}`,
    )
  }
  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new Error(`ai-studio: empty response (finish=${body?.candidates?.[0]?.finishReason})`)
  }
  return {
    data: extractJson(text) as T,
    model,
    provider: "ai-studio",
    tokens: body?.usageMetadata?.totalTokenCount ?? 0,
  }
}

async function viaEmergent<T>(
  system: string,
  user: string,
  schema: JsonSchema,
  maxOutputTokens: number,
): Promise<AiResult<T>> {
  const key = process.env.EMERGENT_LLM_KEY
  if (!key) throw new Error("EMERGENT_LLM_KEY missing")
  const model = `gemini/${geminiModel()}`
  // The OpenAI-compatible gateway has no `responseSchema` equivalent, so the
  // contract is restated in the prompt. Same shape, same guarantees.
  const systemWithSchema = `${system}\n\nRÉPONDS STRICTEMENT avec un objet JSON conforme à ce schéma (aucun texte autour, aucune clé supplémentaire) :\n${JSON.stringify(schema)}`
  const response = await fetch(EMERGENT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      // Reasoning tokens are billed against `max_tokens` on this gateway, so
      // they are switched off and the budget is left entirely to the answer.
      reasoning_effort: "none",
      max_tokens: maxOutputTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemWithSchema },
        { role: "user", content: user },
      ],
    }),
  })
  const body = await response.json()
  if (!response.ok) {
    throw new Error(
      `emergent ${response.status}: ${body?.error?.message ?? JSON.stringify(body).slice(0, 160)}`,
    )
  }
  const choice = body?.choices?.[0]
  const text = choice?.message?.content
  if (!text) {
    throw new Error(`emergent: empty response (finish=${choice?.finish_reason})`)
  }
  return {
    data: extractJson(text) as T,
    model,
    provider: "emergent",
    tokens: body?.usage?.total_tokens ?? 0,
  }
}

/**
 * Structured JSON completion. Tries AI Studio, then the Emergent gateway.
 * Throws a ConvexError (so the message reaches the UI) only when BOTH
 * transports fail — never a fabricated answer.
 */
// A 401/403 from AI Studio means the key's Google project is not authorised —
// remembered per isolate so the next calls skip a pointless round trip.
let aiStudioBlockedUntil = 0

export async function generateJson<T>(opts: {
  system: string
  user: string
  schema: JsonSchema
  maxOutputTokens?: number
}): Promise<AiResult<T>> {
  const cap = opts.maxOutputTokens ?? 2048
  const errors: string[] = []
  if (process.env.GEMINI_API_KEY && Date.now() > aiStudioBlockedUntil) {
    try {
      return await viaAiStudio<T>(opts.system, opts.user, opts.schema, cap)
    } catch (error) {
      const message = (error as Error).message
      if (/ai-studio (401|403)/.test(message)) aiStudioBlockedUntil = Date.now() + 15 * 60 * 1000
      errors.push(message)
    }
  }
  try {
    return await viaEmergent<T>(opts.system, opts.user, opts.schema, cap)
  } catch (error) {
    errors.push((error as Error).message)
  }
  console.error("[ai] all transports failed:", errors.join(" | "))
  throw new ConvexError(
    `Assistant IA indisponible pour le moment (${errors[errors.length - 1] ?? "aucun fournisseur configuré"}).`,
  )
}

/** Reports which transports are configured (Trust Center / status panel). */
export function aiStatus() {
  return {
    model: geminiModel(),
    aiStudio: Boolean(process.env.GEMINI_API_KEY),
    emergent: Boolean(process.env.EMERGENT_LLM_KEY),
  }
}
