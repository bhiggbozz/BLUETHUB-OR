import { motion } from "framer-motion";
import { Container } from "@/components/common/Container";
import { ScrollReveal } from "@/components/common/ScrollReveal";

export function CTABanner() {
  return (
    <section className="bg-background py-12 sm:py-16 lg:py-[80px]">
      <Container>
        <ScrollReveal>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-900 to-blue-800 p-8 sm:px-10 sm:py-16 lg:px-[60px] lg:py-20 text-center">
            {/* Decorative blobs */}
            <div className="pointer-events-none absolute -top-[100px] -right-[100px] size-[200px] rounded-full bg-blue-500/20 sm:size-[320px]" />
            <div className="pointer-events-none absolute -bottom-[80px] -left-[60px] size-[150px] rounded-full bg-accent-500/[0.08] sm:size-[220px]" />

            <h2 className="relative z-10 mb-4 font-serif text-[clamp(26px,4vw,50px)] leading-[1.2] text-white">
              Ready to transform
              <br />
              your school?
            </h2>

            <p className="relative z-10 mb-7 text-sm sm:text-base text-white/65 sm:mb-9">
              Join hundreds of schools already using Bluethub to deliver better
              education, offline and online.
            </p>

            <div className="relative z-10 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3.5">
              <motion.a
                href="#"
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className="inline-block w-full rounded-[10px] bg-white px-6 py-3.5 text-[15px] font-bold text-blue-600 shadow-lg sm:w-auto sm:px-[30px] hover:shadow-xl hover:shadow-black/25"
              >
                Register your school free
              </motion.a>
              <motion.a
                href="#"
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className="inline-block w-full rounded-[10px] border-[1.5px] border-white/30 px-6 py-3.5 text-[15px] font-semibold text-white sm:w-auto sm:px-[30px] hover:bg-white/10"
              >
                Book a demo
              </motion.a>
            </div>
          </div>
        </ScrollReveal>
      </Container>
    </section>
  );
}
