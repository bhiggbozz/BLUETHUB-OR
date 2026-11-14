import { fetchMediaWithAuthFallback } from "./blob";

export const LESSON_MEDIA_CACHE = "bluethub-lesson-media";

// Keep a lesson-scoped cache key so entries can be traced/cleaned by lesson id.
// The "lesson" id is really just a scope for the key — callers also use this
// with a live class id (see `warmLiveClassMediaCache` below), since a live
// class's own media list is fetched independently of the lesson-detail
// endpoint now (that endpoint is teacher-only and 403s for students).
export const buildLessonScopedCacheKey = (lessonId: string, mediaUrl: string): string =>
  `/__lesson_media__/${encodeURIComponent(lessonId)}/${encodeURIComponent(mediaUrl)}`;

export interface CacheableMedia {
  id: string;
  url: string;
}

export type MediaDownloadState = "ready" | "error";

/**
 * Pre-downloads every file in `media` into the Cache API, scoped by
 * `scopeId` (a live class id, or a lesson id) — idempotent, so calling this
 * again for files already cached is cheap (a single `cache.match` each,
 * no re-fetch). Reports each file's outcome as it resolves via `onProgress`,
 * rather than waiting for the whole batch, so a UI can light up files as
 * they individually finish instead of blocking on the slowest one.
 *
 * On a browser without the Cache API (or during SSR), every file is
 * reported "ready" with no blob URL — callers fall back to the file's own
 * remote `url` directly, same as before this existed.
 */
export async function warmLiveClassMediaCache(
  scopeId: string,
  media: CacheableMedia[],
  onProgress?: (mediaId: string, state: MediaDownloadState, blobUrl?: string) => void
): Promise<void> {
  if (typeof window === "undefined" || !("caches" in window)) {
    media.forEach((m) => onProgress?.(m.id, "ready"));
    return;
  }

  const cache = await caches.open(LESSON_MEDIA_CACHE);
  await Promise.all(
    media.map(async (m) => {
      try {
        const scopedKey = buildLessonScopedCacheKey(scopeId, m.url);
        const existing = (await cache.match(scopedKey)) ?? (await cache.match(m.url));
        if (existing) {
          onProgress?.(m.id, "ready", URL.createObjectURL(await existing.blob()));
          return;
        }
        const response = await fetchMediaWithAuthFallback(m.url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        await cache.put(scopedKey, response.clone());
        onProgress?.(m.id, "ready", URL.createObjectURL(await response.blob()));
      } catch {
        onProgress?.(m.id, "error");
      }
    })
  );
}
