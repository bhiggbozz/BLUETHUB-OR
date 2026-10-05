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
    // add VITE_TENANT_ID to evn file no need to change the code for each tenant, just add the tenant id to the env file and it will be used as fallback if no subdomain is found
    const tenant = (import.meta.env.VITE_TENANT_ID as string) || 'westfield';
    return tenant;
  }

  const parts = hostname.split('.');

  if (parts.length >= 3) {
    const subdomain = parts[0];
    return subdomain;
  }
   // add VITE_TENANT_ID to evn file no need to change the code for each tenant, just add the tenant id to the env file and it will be used as fallback if no subdomain is found
  const fallback = (import.meta.env.VITE_TENANT_ID as string) || 'westfield';
  return fallback;
}