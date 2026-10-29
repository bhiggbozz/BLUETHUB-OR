import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@bluethub/ui-kit/components/ui/dialog";
import type { RoadmapItem } from "@/data/home";
import { ROADMAP_PREVIEWS } from "../mockups/RoadmapPreviews";

interface RoadmapPreviewDialogProps {
  item: RoadmapItem | null;
  onClose: () => void;
}

/**
 * Concept-preview dialog for roadmap cards. Loaded lazily (with the preview
 * mockups) the first time someone opens a preview, so neither the Radix
 * Dialog nor the mockups weigh on the initial page load.
 */
export default function RoadmapPreviewDialog({ item, onClose }: RoadmapPreviewDialogProps) {
  const Preview = item ? ROADMAP_PREVIEWS[item.id] : null;
  return (
    <Dialog open={item !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90dvh] gap-5 overflow-y-auto rounded-xl border-border bg-card p-5 sm:max-w-xl md:p-6">
        {item && Preview && (
          <>
            <DialogHeader className="text-left">
              <p className="eyebrow">Concept preview · not available yet</p>
              <DialogTitle className="text-h3">{item.name}</DialogTitle>
              <DialogDescription className="text-[0.9375rem] text-muted-foreground">{item.line}</DialogDescription>
            </DialogHeader>
            <Preview />
            <p className="text-caption">
              An early concept to show the direction. The final design will be shaped with pilot schools.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
