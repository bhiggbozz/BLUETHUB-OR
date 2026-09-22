import { Download, Eye, FileText, ImageIcon, PlayCircle } from "lucide-react";
import { Button, Badge, Card, CardContent } from "@bluethub/ui-kit";
import { cn } from "@/lib/utils";
import type { StudentLessonMedia } from "@/services/student";

// ---------------------------------------------------------------------------
// API shape — matches GET .../lesson-content media payload exactly
// ---------------------------------------------------------------------------

type MediaKind = "pdf" | "image" | "video" | "document";

// ---------------------------------------------------------------------------
// Derivation helpers — the API gives us bytes/mimetype-ish fields, not
// display-ready strings, so we compute the presentation layer here.
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function getMediaKind(media: StudentLessonMedia): MediaKind {
  const ext = media.fileExtension?.toLowerCase() ?? "";

  if (media.mediaType === "Image" || ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) {
    return "image";
  }
  if (media.mediaType === "Video" || ["mp4", "mov", "webm", "avi", "mkv"].includes(ext)) {
    return "video";
  }
  if (ext === "pdf") return "pdf";
  return "document";
}

// `mediaName` is a storage key (uuid.ext), not a human title. Until the API
// returns a friendly name alongside it, fall back to something readable.
function getFallbackTitle(media: StudentLessonMedia, kind: MediaKind) {
  const label = kind === "pdf" ? "PDF Document" : kind === "document" ? "Document" : kind === "image" ? "Image" : "Video";
  return `${label} ${media.displayOrder}`;
}

const kindStyles: Record<MediaKind, { tile: string; icon: React.ReactNode }> = {
  pdf: { tile: "bg-rose-500", icon: <FileText className="h-4.5 w-4.5" /> },
  document: { tile: "bg-[#292382]", icon: <FileText className="h-4.5 w-4.5" /> },
  image: { tile: "bg-sky-500", icon: <ImageIcon className="h-4.5 w-4.5" /> },
  video: { tile: "bg-violet-600", icon: <PlayCircle className="h-4.5 w-4.5" /> },
};

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

function ResourceAction({ media, kind }: { media: StudentLessonMedia; kind: MediaKind }) {
  const label = kind === "video" ? "Play" : kind === "image" ? "Preview" : "Download";
  const icon =
    kind === "video" ? (
      <PlayCircle className="h-4 w-4" />
    ) : kind === "image" ? (
      <Eye className="h-4 w-4" />
    ) : (
      <Download className="h-4 w-4" />
    );

  return (
    <Button size="icon" variant="secondary" className="h-9 w-9 shrink-0 rounded-full" asChild aria-label={`${label} ${media.mediaName}`}>
      <a href={media.url} target="_blank" rel="noreferrer">
        {icon}
      </a>
    </Button>
  );
}

function MediaRow({ media }: { media: StudentLessonMedia; }) {
  const kind = getMediaKind(media);
  const displayTitle = media.mediaName ?? getFallbackTitle(media, kind);
  const styles = kindStyles[kind];

  return (
    <Card className="border-none shadow-sm p-0">
      <CardContent className="flex items-center gap-3 p-4">
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white", styles.tile)}>
          {styles.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{displayTitle}</p>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
            <span>{formatFileSize(media.fileSizeBytes ?? 0)}</span>
            <Badge variant="secondary" className="rounded-full px-1.5 py-0 text-[10px] uppercase">
              {media.fileExtension}
            </Badge>
          </div>
        </div>
        <ResourceAction media={media} kind={kind} />
      </CardContent>
    </Card>
  );
}

export default MediaRow;