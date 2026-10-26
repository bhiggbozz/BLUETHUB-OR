import { useEffect } from "react";
import { ButtonLink } from "@/components/common/Button";
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
            <h1 className="text-h1 mt-4">This page has moved, or never existed.</h1>
            <p className="text-lede mt-6 measure">
              Check the address for a typo, or head somewhere useful. If a link on our site brought you here, we'd like to
              know so we can fix it.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink href="/" size="lg" arrow>
                Back to the homepage
              </ButtonLink>
              <ButtonLink href="/#contact" size="lg" variant="secondary">
                Tell us about the broken link
              </ButtonLink>
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
