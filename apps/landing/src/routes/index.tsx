import { lazy, type ComponentType } from "react";

// The home page is the site: load it eagerly so first paint needs no extra round-trip.
import LandingPage from "@/pages/LandingPage";
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

interface RouteConfig {
  path: string;
  element: ComponentType;
}

export const routes: RouteConfig[] = [
  {
    path: "/",
    element: LandingPage,
  },
  {
    // Any unknown path: friendly 404 (marked noindex).
    path: "*",
    element: NotFoundPage as unknown as ComponentType,
  },
];
