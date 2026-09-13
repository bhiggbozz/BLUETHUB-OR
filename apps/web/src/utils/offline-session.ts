// Tracks whether the app has had confirmed contact with the backend recently,
// so a student can keep using already-cached lessons for a bounded window
// after going offline instead of being logged out the moment a network call
// fails. "Confirmed contact" is reset on every successful login or token
// refresh — so a student who reconnects even briefly keeps extending their
// window; only a continuous stretch with zero online contact expires it.
const LAST_ONLINE_CONTACT_KEY = "lastOnlineContactAt";
const CACHED_USER_KEY = "cachedUserSnapshot";

export const OFFLINE_GRACE_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

export function markOnlineContact(): void {
  try {
    localStorage.setItem(LAST_ONLINE_CONTACT_KEY, String(Date.now()));
  } catch {
    // localStorage unavailable (private mode, quota) — offline grace simply
    // won't be extendable; not fatal.
  }
}

export function getLastOnlineContact(): number | null {
  try {
    const raw = localStorage.getItem(LAST_ONLINE_CONTACT_KEY);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

// True only once we've actually confirmed online contact at least once
// (never grants grace to a session that's never successfully talked to the
// backend) and that contact was within the last 3 days.
export function isWithinOfflineGrace(): boolean {
  const last = getLastOnlineContact();
  if (!last) return false;
  return Date.now() - last <= OFFLINE_GRACE_MS;
}

export function clearOfflineSession(): void {
  try {
    localStorage.removeItem(LAST_ONLINE_CONTACT_KEY);
    localStorage.removeItem(CACHED_USER_KEY);
  } catch {
    // ignore
  }
}

// A snapshot of the last successfully fetched user object, so an offline
// app reopen (new tab / browser restart, not just a stale in-memory session)
// has something to hydrate from instead of forcing a fresh online login.
export function saveCachedUser<T>(user: T): void {
  try {
    localStorage.setItem(CACHED_USER_KEY, JSON.stringify(user));
  } catch {
    // ignore
  }
}

export function getCachedUser<T>(): T | null {
  try {
    const raw = localStorage.getItem(CACHED_USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

// A failed request with no `response` means the request never reached (or
// heard back from) the server — a connectivity problem, not a real rejection
// from the backend. Combined with navigator.onLine, this is how we tell
// "genuinely offline" apart from "server said no."
export function isNetworkFailure(err: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  if (err && typeof err === "object" && "response" in err) {
    return (err as { response?: unknown }).response === undefined;
  }
  return false;
}
