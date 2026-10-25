import { AnimatePresence, motion } from "framer-motion";
import { Command, Repeat2, Sparkles, X } from "lucide-react";
import { useParentChildren } from "@/contexts/parent-children-context";
import { IconButton } from "../../component/ui/button";
import { Kbd } from "../../component/ui/feedback";
import { smooth } from "../../component/ui/motion";
import { useLocalFlag } from "../../lib/hooks";
import { isApplePlatform } from "../../lib/format";

/** A one-time, dismissible orientation for new parents. Remembered per browser. */
export function WelcomeGuide() {
  const [dismissed, setDismissed] = useLocalFlag("bluethub.parent.welcomeDismissed");
  const { children: list } = useParentChildren();
  const mod = isApplePlatform() ? "⌘" : "Ctrl";

  const tips = [
    list.length > 1
      ? {
          icon: <Repeat2 className="size-4" />,
          title: "Switch between children",
          body: "Use the name at the top of the menu. Every page follows your choice.",
        }
      : {
          icon: <Repeat2 className="size-4" />,
          title: "Everything follows your child",
          body: "If the school links another child later, a switcher appears in the menu.",
        },
    {
      icon: <Sparkles className="size-4" />,
      title: "Practice at home",
      body: "Build a short quiz from what was actually taught in class.",
    },
    {
      icon: <Command className="size-4" />,
      title: "Jump anywhere",
      body: (
        <>
          Press <Kbd>{mod}</Kbd> <Kbd>K</Kbd> to search pages and children.
        </>
      ),
    },
  ];

  return (
    <AnimatePresence initial={false}>
      {!dismissed && (
        <motion.section
          key="welcome"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={smooth}
          className="overflow-hidden"
          aria-label="Getting started"
        >
          <div className="pp-surface-flat relative p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="pp-eyebrow">Getting started</p>
                <p className="pp-display mt-1 text-[17px] font-semibold text-(--pp-text)">Three things worth knowing</p>
              </div>
              <IconButton label="Dismiss getting started" onClick={() => setDismissed(true)} className="-mt-1 -mr-1">
                <X className="size-4" />
              </IconButton>
            </div>
            <ol className="mt-4 grid gap-3 sm:grid-cols-3">
              {tips.map((t, i) => (
                <li key={t.title} className="rounded-2xl bg-(--pp-sunken) p-4">
                  <div className="flex items-center gap-2 text-(--pp-iris)">
                    {t.icon}
                    <span className="pp-num text-[11px] font-semibold text-(--pp-subtle)">0{i + 1}</span>
                  </div>
                  <p className="mt-2 text-[14px] font-semibold text-(--pp-text)">{t.title}</p>
                  <p className="mt-1 text-[13px] leading-5 text-(--pp-muted)">{t.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
