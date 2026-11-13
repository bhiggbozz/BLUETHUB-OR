/**
 * Wire format for "teacher is showing this media file" sync, carried on the
 * LiveKit data channel's "media" topic — a sibling of the "board" topic in
 * `live-board-data-channel.ts`, but fully independent of it. Mirrors that
 * module's encode/decode shape (JSON over `TextEncoder`/`TextDecoder`,
 * discriminant key `t`) purely for consistency; nothing here is shared code.
 */

export type MediaDataMessage =
  | { t: "open"; mediaId: string }
  | { t: "close" }
  /** Teacher's current PDF page for whichever file is open — additive, a
   * sibling of "open"/"close", never replaces them. Only meaningful while
   * the named file is the one currently open. */
  | { t: "page"; mediaId: string; page: number };

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function encodeMediaMessage(msg: MediaDataMessage): Uint8Array {
  return encoder.encode(JSON.stringify(msg));
}

export function decodeMediaMessage(payload: Uint8Array): MediaDataMessage | null {
  try {
    const parsed = JSON.parse(decoder.decode(payload));
    if (parsed && (parsed.t === "open" || parsed.t === "close" || parsed.t === "page")) {
      return parsed as MediaDataMessage;
    }
    return null;
  } catch {
    return null;
  }
}
