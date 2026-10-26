import { lazy, type ComponentType } from "react";

const LandingPage = lazy(() => import("@/pages/LandingPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

interface RouteConfig {
  path: string;
  element: ComponentType;
}

export const routes: RouteConfig[] = [
  {
    path: "/",
    element: LandingPage as unknown as ComponentType,
  },
  {
    // Any unknown path: friendly 404 (marked noindex).
    path: "*",
    element: NotFoundPage as unknown as ComponentType,
  },
];
