/**
 * Local-first Ollama client.
 *
 * AI features run against a locally-hosted open-source model (Llama / Qwen / Mistral)
 * via Ollama — completely free, no external API, no vendor lock-in.
 *
 * When Ollama is not reachable (e.g. the deployed Vercel app, or a dev box without
 * Ollama running), every call degrades gracefully: `isAvailable()` returns false and
 * `generate()` returns null, so callers fall back to deterministic narratives.
 *
 * Configure with env vars:
 *   OLLAMA_URL   (default http://localhost:11434)
 *   OLLAMA_MODEL (default llama3.2)
 */

export const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'llama3.2';

async function withTimeout<T>(p: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await p(ctrl.signal);
  } finally {
    clearTimeout(timer);
  }
}

/** Fast reachability probe — short timeout so it never blocks a request on Vercel. */
export async function isAvailable(timeoutMs = 800): Promise<boolean> {
  try {
    return await withTimeout(async (signal) => {
      const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal });
      return res.ok;
    }, timeoutMs);
  } catch {
    return false;
  }
}

export interface GenerateOptions {
  system?: string;
  /** Lower = more deterministic. */
  temperature?: number;
  timeoutMs?: number;
}

/**
 * Generate a completion from the local model. Returns the text, or null if Ollama
 * is unreachable / errors — callers MUST handle null with a deterministic fallback.
 */
export async function generate(prompt: string, opts: GenerateOptions = {}): Promise<string | null> {
  const { system, temperature = 0.2, timeoutMs = 45_000 } = opts;
  try {
    return await withTimeout(async (signal) => {
      const res = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt,
          system,
          stream: false,
          options: { temperature },
        }),
        signal,
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { response?: string };
      return json.response?.trim() ?? null;
    }, timeoutMs);
  } catch {
    return null;
  }
}
