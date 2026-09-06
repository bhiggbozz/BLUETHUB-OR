import type { CloudinarySignature, SupabaseUploadToken } from "@/services/lesson";

// Runs `fn` over `items` with at most `limit` in flight at once. A single
// item's rejection doesn't stop the others — callers track per-item success.
export async function runConcurrent<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  const queue = [...items];
  const workers = Array.from(
    { length: Math.min(limit, queue.length) },
    async () => {
      while (queue.length > 0) {
        const item = queue.shift()!;
        await fn(item).catch(() => { });
      }
    }
  );
  await Promise.all(workers);
}

export function uploadToCloudinary(
  file: File,
  sig: CloudinarySignature,
  onProgress: (pct: number) => void
): Promise<{
  public_id: string;
  secure_url: string;
  bytes: number;
  duration?: number;
  format: string;
  original_filename: string;
}> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("api_key", sig.apiKey);
    fd.append("timestamp", String(sig.timestamp));
    fd.append("signature", sig.signature);
    fd.append("folder", sig.folder);
    if (sig.uploadPreset) fd.append("upload_preset", sig.uploadPreset);
    if (sig.resourceType) fd.append("resource_type", sig.resourceType);

    const uploadUrl = sig.resourceType
      ? `https://api.cloudinary.com/v1_1/${sig.cloudName}/${sig.resourceType}/upload`
      : `https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`;

    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        onProgress(Math.min(95, Math.round((e.loaded / e.total) * 95)));
    };
    xhr.onload = () => {
      if (xhr.status === 200) {
        onProgress(100);
        resolve(JSON.parse(xhr.responseText));
      } else {
        try {
          const body = JSON.parse(xhr.responseText);
          reject(new Error(body?.error?.message ?? `Upload failed (${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      }
    };
    xhr.onerror = () => reject(new Error("Network error — check your connection"));
    xhr.open("POST", uploadUrl);
    xhr.send(fd);
  });
}

// scheduledDate/token.uploadUrl are per-request — each file needs its own
// fresh Supabase token (see the fix on the lesson submit-flow's PDF path).
export function uploadToSupabase(
  file: File,
  token: SupabaseUploadToken,
  onProgress: (pct: number) => void
): Promise<{
  publicUrl: string;
  bucketPath: string;
}> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        onProgress(Math.min(95, Math.round((e.loaded / e.total) * 95)));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        if (!token.publicUrl) {
          reject(new Error("Supabase upload succeeded but no public URL was returned"));
          return;
        }
        resolve({
          publicUrl: token.publicUrl,
          bucketPath: token.bucketPath,
        });
      } else {
        try {
          const body = JSON.parse(xhr.responseText);
          reject(new Error(body?.message ?? `Upload failed (${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      }
    };
    xhr.onerror = () => reject(new Error("Network error — check your connection"));
    xhr.open("POST", token.uploadUrl);
    xhr.setRequestHeader("Authorization", `Bearer ${token.token}`);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.setRequestHeader("x-upsert", "true");
    xhr.send(file);
  });
}
