import { useEffect } from "react";
import { Cta } from "@/components/common/Cta";
import { Container } from "@/components/common/Container";
import { Navbar } from "@/components/landing/navbar/Navbar";
import { Footer } from "@/components/landing/footer/Footer";

export default function NotFoundPage() {
  // index.html carries the home title for crawlers; swap it while this page is shown.
  useEffect(() => {
    const previous = document.title;
    document.title = "Page not found · Bluethub";
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <>
      <meta name="robots" content="noindex" />
      <Navbar />
      <main id="main" tabIndex={-1} className="outline-none">
        <Container className="grid min-h-[70vh] items-center py-24">
          <div className="max-w-2xl">
            <p className="eyebrow">Error 404</p>
            <h1 className="text-h1 mt-4">This page skipped class.</h1>
            <p className="text-lede mt-6 measure">The link may be old or mistyped. Let's get you somewhere useful.</p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Cta href="/" size="lg" arrow>
                Back to the homepage
              </Cta>
              <Cta href="/#demo" size="lg" tone="secondary">
                Book a demo
              </Cta>
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
