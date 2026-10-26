import { Suspense } from "react";
import { MotionConfig } from "framer-motion";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { routes } from "@/routes/index";

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="size-8 animate-spin rounded-full border-4 border-border border-t-primary" />
    </div>
  );
}

export default function App() {
  return (
    // reducedMotion="user": every Framer animation respects prefers-reduced-motion.
    <MotionConfig reducedMotion="user">
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {routes.map(({ path, element: Component }) => (
            <Route key={path} path={path} element={<Component />} />
          ))}
        </Routes>
      </Suspense>
    </BrowserRouter>
    </MotionConfig>
  );
}
