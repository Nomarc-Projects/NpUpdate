import "server-only";

/**
 * Burst generation for the VM-less (`local`) Helm backend.
 *
 * A direct port of `helm/src/helm/ai/provider.py`: the same OpenAI-compatible
 * `/chat/completions` shape, the same three providers, the same failover
 * semantics. The VM still exists and is still the default when configured — this
 * exists so the assistant can work on Vercel alone.
 *
 * Key handling is identical in spirit to HELM_INTERNAL_TOKEN: read from env,
 * never exposed to the client, and the module is `server-only` so a stray import
 * from a client component fails at build rather than shipping a key.
 */

/** One OpenAI-compatible endpoint. */
export type BurstProvider = {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
};

export type ProviderResponse = {
  text: string;
  finishReason: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  /** Which provider actually answered — "cerebras", or "cerebras+groq" style
   *  only when the first is tried before failing over. Useful in logs. */
  provider: string;
};

/** Defaults mirror provider.py's _PROVIDER_DEFAULTS. Model ids go stale, so
 *  HELM_{PROVIDER}_MODEL overrides them without a code change. */
const PROVIDER_DEFAULTS: Record<string, { baseUrl: string; model: string }> = {
  cerebras: { baseUrl: "https://api.cerebras.ai/v1", model: "llama-3.3-70b" },
  groq: { baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
  sambanova: { baseUrl: "https://api.sambanova.ai/v1", model: "Meta-Llama-3.3-70B-Instruct" },
};

const DEFAULT_ORDER = "cerebras,groq,sambanova";

function buildOne(name: string): BurstProvider | null {
  const key = process.env[`HELM_${name.toUpperCase()}_API_KEY`];
  if (!key) return null;
  const fallback = PROVIDER_DEFAULTS[name];
  if (!fallback) return null;
  const baseUrl = (process.env[`HELM_${name.toUpperCase()}_BASE_URL`] || fallback.baseUrl).replace(/\/+$/, "");
  const model = process.env[`HELM_${name.toUpperCase()}_MODEL`] || fallback.model;
  if (!baseUrl || !model) return null;
  return { name, baseUrl, apiKey: key, model };
}

/** Configured providers in failover order. Empty means "no LLM configured",
 *  which callers must degrade on rather than crash. */
export function burstProviders(): BurstProvider[] {
  const order = (process.env.HELM_BURST_ORDER || DEFAULT_ORDER)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return order.map(buildOne).filter((p): p is BurstProvider => p !== null);
}

/** True when at least one provider key is present. The local backend's
 *  equivalent of the VM's `helmConfigured`. */
export function localConfigured(): boolean {
  return burstProviders().length > 0;
}

/** Names of the configured providers, for /health-style reporting. */
export function providerNames(): string[] {
  return burstProviders().map((p) => p.name);
}

const TIMEOUT_MS = 60_000;

async function generateOne(
  p: BurstProvider,
  prompt: string,
  params: { temperature?: number; maxTokens?: number },
): Promise<ProviderResponse> {
  const body: Record<string, unknown> = {
    model: p.model,
    messages: [{ role: "user", content: prompt }],
    temperature: params.temperature ?? 0.7,
  };
  if (params.maxTokens != null) body.max_tokens = params.maxTokens;

  const res = await fetch(`${p.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${p.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) {
    // Include the body: providers put the useful reason (bad key, unknown model,
    // rate limit) there and the status alone is rarely enough to debug.
    throw new Error(`${p.name} ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string | null }; finish_reason?: string | null }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const choice = data.choices?.[0];
  return {
    text: choice?.message?.content ?? "",
    finishReason: choice?.finish_reason ?? null,
    inputTokens: data.usage?.prompt_tokens ?? null,
    outputTokens: data.usage?.completion_tokens ?? null,
    provider: p.name,
  };
}

/**
 * Generate, failing over to the next provider on transport/HTTP error — the same
 * behaviour as provider.py's FallbackChatProvider. Throws only when every
 * provider has failed, so the caller can decide how to degrade.
 */
export async function generate(
  prompt: string,
  params: { temperature?: number; maxTokens?: number } = {},
): Promise<ProviderResponse> {
  const providers = burstProviders();
  if (providers.length === 0) throw new Error("No Helm burst provider is configured");

  let lastError: unknown;
  for (const p of providers) {
    try {
      return await generateOne(p, prompt, params);
    } catch (err) {
      lastError = err;
      console.error(`[helm:local] ${p.name} failed, trying next:`, err instanceof Error ? err.message : err);
    }
  }
  throw new Error(`all burst providers failed: ${lastError instanceof Error ? lastError.message : lastError}`);
}
