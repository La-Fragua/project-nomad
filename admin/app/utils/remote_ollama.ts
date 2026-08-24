import env from '#start/env'
import KVStore from '#models/kv_store'

/**
 * Strip trailing slashes so `/api` and `/v1` joins stay consistent.
 */
export function normalizeOllamaBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '')
}

/**
 * Compose-time remote Ollama only (Unraid / external GPU host).
 * Empty or unset means "do not seed remote Ollama on boot".
 */
export function getRemoteOllamaUrlFromEnv(): string | null {
  const fromEnv = (env.get('NOMAD_REMOTE_OLLAMA_URL') ?? '').trim()
  return fromEnv ? normalizeOllamaBaseUrl(fromEnv) : null
}

/**
 * Effective remote Ollama URL: env wins, then the KV value set by Settings / the wizard.
 */
export async function resolveRemoteOllamaUrl(): Promise<string | null> {
  const fromEnv = getRemoteOllamaUrlFromEnv()
  if (fromEnv) return fromEnv
  const fromKv = ((await KVStore.getValue('ai.remoteOllamaUrl')) as string | null)?.trim() ?? ''
  return fromKv ? normalizeOllamaBaseUrl(fromKv) : null
}
