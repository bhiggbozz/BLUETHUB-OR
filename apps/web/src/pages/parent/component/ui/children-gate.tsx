import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Mail, Users } from "lucide-react";
import { useParentChildren } from "@/contexts/parent-children-context";
import type { ParentChild } from "@/services/parent";
import { EmptyState, ErrorState } from "./feedback";
import { fadeUp } from "./motion";

interface ChildrenGateProps {
  /** Layout-matched placeholder shown while children load. */
  skeleton: ReactNode;
  children: (child: ParentChild) => ReactNode;
}

/**
 * Every parent page depends on GET /api/User/my-children. This renders the
 * loading, error and "nothing linked yet" states once, consistently.
 */
export function ChildrenGate({ skeleton, children }: ChildrenGateProps) {
  const { loading, error, selectedChild, refresh } = useParentChildren();

  if (loading) return <>{skeleton}</>;

  if (error) {
    return (
      <motion.div variants={fadeUp}>
        <ErrorState title="We couldn't load your children" message={error} onRetry={() => void refresh()} />
      </motion.div>
    );
  }

  if (!selectedChild) {
    return (
      <motion.div variants={fadeUp} className="pp-surface">
        <EmptyState
          icon={<Users className="size-5" />}
          title="No children are linked to your account yet"
          description="Your school links each child's record to your parent account. Once that's done, attendance and practice tools appear here automatically."
          action={
            <p className="inline-flex items-center gap-2 rounded-full bg-(--pp-sunken) px-3.5 py-2 text-[12px] font-medium text-(--pp-muted)">
              <Mail className="size-3.5" /> Ask your school administrator to link your child
            </p>
          }
        />
      </motion.div>
    );
  }

  return <>{children(selectedChild)}</>;
}
