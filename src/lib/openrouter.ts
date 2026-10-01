import "server-only";

// The single OpenRouter endpoint this app may call. Fixed on purpose: no path,
// query or host is ever taken from a request, so nothing here can be steered
// to another OpenRouter API.
const KEY_ENDPOINT = "https://openrouter.ai/api/v1/key";
const TIMEOUT_MS = 10_000;

export type Quota = {
  limit: number | null;
  limitRemaining: number | null;
  limitReset: string | null;
  usage: number;
  usageDaily: number;
  usageWeekly: number;
  usageMonthly: number;
  byokUsage: number;
  isFreeTier: boolean;
  expiresAt: string | null;
  freeModelRequests: { used: number; limit: number; remaining: number } | null;
};

export type QuotaResult =
  | { ok: true; fetchedAt: string; quota: Quota }
  | { ok: false; fetchedAt: string; reason: "not-configured" | "unauthorized" | "upstream" | "network" };

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const numOrNull = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;
const strOrNull = (v: unknown): string | null => (typeof v === "string" ? v : null);

// Whitelist: only these fields leave this module. `label` (a masked copy of the
// key) and the user/org/workspace ids are deliberately dropped.
export function pickQuota(body: unknown): Quota | null {
  const data = (body as { data?: Record<string, unknown> } | null)?.data;
  if (!data || typeof data !== "object") return null;
  const free = data.free_model_daily_requests as Record<string, unknown> | undefined;
  return {
    limit: numOrNull(data.limit),
    limitRemaining: numOrNull(data.limit_remaining),
    limitReset: strOrNull(data.limit_reset),
    usage: num(data.usage),
    usageDaily: num(data.usage_daily),
    usageWeekly: num(data.usage_weekly),
    usageMonthly: num(data.usage_monthly),
    byokUsage: num(data.byok_usage),
    isFreeTier: data.is_free_tier === true,
    expiresAt: strOrNull(data.expires_at),
    freeModelRequests: free
      ? { used: num(free.used), limit: num(free.limit), remaining: num(free.remaining) }
      : null,
  };
}

export async function getQuota(): Promise<QuotaResult> {
  const fetchedAt = new Date().toISOString();
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return { ok: false, fetchedAt, reason: "not-configured" };

  try {
    const res = await fetch(KEY_ENDPOINT, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status === 401 || res.status === 403) return { ok: false, fetchedAt, reason: "unauthorized" };
    if (!res.ok) return { ok: false, fetchedAt, reason: "upstream" };
    const quota = pickQuota(await res.json());
    if (!quota) return { ok: false, fetchedAt, reason: "upstream" };
    return { ok: true, fetchedAt, quota };
  } catch {
    // Never forward the thrown error: it could echo request details.
    return { ok: false, fetchedAt, reason: "network" };
  }
}
