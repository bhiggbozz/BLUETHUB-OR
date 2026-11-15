import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App.tsx"
import { AuthProvider } from "./contexts/auth-context.tsx"
import { API } from "./services/auth.ts"
import { getTenantFromUrl } from "./utils/subdomain.ts"
import { ErrorBoundary } from "./component/ErrorBoundary";
import { registerPwaUpdates } from "./utils/pwa-update";

// main.tsx
const tenantId = getTenantFromUrl()

if (!tenantId) {
  window.location.href = "new-bluethub-app.netlify.app"
} else {
  API.defaults.headers.common["X-Tenant-ID"] = tenantId

  registerPwaUpdates()

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
