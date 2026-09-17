export const getSubdomain = (): string | null => {
    const hostname = window.location.hostname;

    if (hostname === "localhost" || hostname === "127.0.0.1") {
        const params = new URLSearchParams(window.location.search);
        return params.get("tenant");
    }

    const baseDomain = import.meta.env.VITE_APP_URL;
    if (hostname === baseDomain) return null;
    if (!hostname.endsWith(`.${baseDomain}`)) return null; // ← safety fix

    return hostname.replace(`.${baseDomain}`, "");
};


export function getTenantFromUrl(): string {
  const hostname = window.location.hostname;

  // console.log('[getTenantFromUrl] hostname:', hostname);

  const isLocal   = hostname === 'localhost' || hostname === '127.0.0.1';
  const isNetlify = hostname.endsWith('.netlify.app');

  if (isLocal || isNetlify) {
    const tenant = (import.meta.env.VITE_TENANT_ID as string) || 'westfield';
    // console.log('[getTenantFromUrl] dev/staging → using env fallback:', tenant);
    return tenant;
  }

  const parts = hostname.split('.');
  // console.log('[getTenantFromUrl] hostname parts:', parts);

  if (parts.length >= 3) {
    const subdomain = parts[0];
    // console.log('[getTenantFromUrl] production → subdomain extracted:', subdomain);
    return subdomain;
  }

  const fallback = (import.meta.env.VITE_TENANT_ID as string) || 'westfield';
  // console.log('[getTenantFromUrl] fallback → no subdomain found, using:', fallback);
  return fallback;
}