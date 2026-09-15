import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App.tsx"
import { AuthProvider } from "./contexts/auth-context.tsx"
import { API } from "./services/auth.ts"
import { getTenantFromUrl } from "./utils/subdomain.ts"
import { ErrorBoundary } from "./component/ErrorBoundary";

// main.tsx
const tenantId = getTenantFromUrl()

if (!tenantId) {
  window.location.href = "new-bluethub-app.netlify.app"
} else {
  API.defaults.headers.common["X-Tenant-ID"] = tenantId

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").then((registration:any) => {
        registration.onupdatefound = () => {
          const installingWorker = registration.installing
          installingWorker.onstatechange = () => {
            if (installingWorker.state === "installed") {
              if (navigator.serviceWorker.controller) {
                // console.log("New content is available; please refresh.")
              } else {
                // console.log("Content cached for offline use.")
              }
            }
          }
        }
      }).catch((error) => {
        console.error("Service worker registration failed:", error)
      })
    })
  }

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ErrorBoundary>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ErrorBoundary>
    </StrictMode>
  )
}
// }
