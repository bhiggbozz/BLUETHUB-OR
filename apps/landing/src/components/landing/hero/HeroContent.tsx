import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { MotionLink } from "@/components/common/MotionButton";

export function HeroContent() {
  return (
    <div>
      <motion.span
        className="mb-5 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <span className="size-1.5 rounded-full bg-blue-600 animate-pulse dark:bg-blue-400" />
        E-Learning Platform · Now Live
      </motion.span>

      <motion.h1
        className="mb-5.5 font-serif text-[clamp(30px,5vw,62px)] leading-[1.12] tracking-[-0.5px] text-navy-900 dark:text-surface-50"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.4, 0.25, 1] }}
      >
        Smart learning for{" "}
        <em className="italic text-blue-600 dark:text-blue-400">every school,</em>{" "}
        every student
      </motion.h1>

      <motion.p
        className="mb-9 max-w-[480px] text-base sm:text-[17px] leading-[1.75] text-muted"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.35 }}
      >
        Bluethub connects schools, teachers, students and parents on one powerful
        platform — with offline-first tools, intelligent question banks, and real-time
        progress monitoring.
      </motion.p>

      <motion.div
        className="flex flex-wrap items-center gap-3.5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <MotionLink href="#" variant="primary" size="md">
          <ArrowRight className="size-4" />
          Start free trial
        </MotionLink>
        <MotionLink href="#features" variant="secondary" size="md">
          Explore features
        </MotionLink>
      </motion.div>
    </div>
  );
}
