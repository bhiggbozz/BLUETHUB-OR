import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Check, Copy, LayoutGrid, Plus } from "lucide-react";
import { toast } from "@bluethub/ui-kit";
import type { QuickCreateResponseData } from "@/services/parent-assessment";
import { Button } from "../../component/ui/button";
import { Badge, InlineNotice } from "../../component/ui/feedback";
import { ease } from "../../component/ui/motion";

interface SuccessPanelProps {
  result: QuickCreateResponseData;
  firstName: string;
  onStartOver: () => void;
}

export function SuccessPanel({ result, firstName, onStartOver }: SuccessPanelProps) {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [copied, setCopied] = useState(false);
  const partial = result.byDifficulty.filter((d) => d.included < d.requested);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.code);
      setCopied(true);
      toast.success("Assessment code copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Select the code and copy it manually.");
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease }}
      className="pp-surface overflow-hidden"
    >
      <div className="pp-spotlight rounded-none! px-6 pt-10 pb-8 text-center shadow-none!">
        <div className="relative mx-auto mb-5 size-16">
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full bg-(--pp-present)/30"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={reduce ? { opacity: 0.6 } : { scale: [0.6, 1.5], opacity: [0.7, 0] }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
          <motion.span
            className="relative inline-flex size-16 items-center justify-center rounded-full bg-(--pp-present) text-white shadow-[0_0_30px_-4px_rgba(12,143,99,0.8)]"
            initial={{ scale: reduce ? 1 : 0.5 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 22 }}
          >
            <Check className="size-8" strokeWidth={3} />
          </motion.span>
        </div>
        <p className="pp-eyebrow text-white/50!">Assigned to {firstName}</p>
        <h2 className="pp-display mt-2 text-[24px] font-semibold text-white">{result.title}</h2>
        <p className="mt-1.5 text-[14px] text-white/60">
          {result.totalQuestions} question{result.totalQuestions === 1 ? "" : "s"}. It's waiting in {firstName}'s assessments now.
        </p>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap justify-center gap-2">
          {result.byDifficulty.map((d) => (
            <Badge key={d.difficultyLevel} tone={d.included < d.requested ? "warn" : "neutral"}>
              {d.difficultyLevelName}: <span className="pp-num">{d.included}</span>
            </Badge>
          ))}
        </div>

        {partial.length > 0 && (
          <InlineNotice tone="warn" icon={<AlertTriangle className="size-4" />}>
            <p className="font-semibold">Some levels had fewer questions than you asked for.</p>
            <ul className="mt-1 space-y-0.5 text-(--pp-muted)">
              {partial.map((d) => (
                <li key={d.difficultyLevel}>
                  {d.difficultyLevelName}: {d.included} of {d.requested} included.
                </li>
              ))}
            </ul>
          </InlineNotice>
        )}

        <div className="mx-auto flex max-w-sm items-center gap-2 rounded-2xl border border-(--pp-line) bg-(--pp-sunken) p-1.5 pl-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-(--pp-subtle)">Assessment code</p>
            <p className="pp-mono truncate text-[16px] font-semibold text-(--pp-text) select-all">{result.code}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={copy} icon={copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}>
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={onStartOver} icon={<Plus className="size-4" />}>
            Create another
          </Button>
          <Button variant="secondary" onClick={() => navigate("/parent")} icon={<LayoutGrid className="size-4" />}>
            Back to overview
          </Button>
        </div>
      </div>
    </motion.section>
  );
}
