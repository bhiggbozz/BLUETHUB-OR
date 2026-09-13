import { useEffect } from 'react';
import axios from 'axios';
import { isNetworkFailure, isWithinOfflineGrace } from '@/utils/offline-session';

const ACTIVITY_TIMESTAMP_KEY = 'lastActivityTime';
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const CHECK_INTERVAL_MS = 60 * 1000;

const getLastActivity = (): number | null => {
  const stored = localStorage.getItem(ACTIVITY_TIMESTAMP_KEY);
  return stored ? Number(stored) : null;
};

const isIdle = (): boolean => {
  const last = getLastActivity();
  if (!last) return true;
  return Date.now() - last > IDLE_TIMEOUT_MS;
};

const logOutAndRedirect = () => {
  localStorage.clear();
  if (window.location.pathname !== '/auth') {
    window.location.href = '/auth';
  }
};

type RefreshOutcome = 'success' | 'network-error' | 'rejected';

const attemptTokenRefresh = async (): Promise<RefreshOutcome> => {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return 'rejected';

  try {
    const { data } = await axios.post(
      `${import.meta.env.VITE_API_BASE_URL}/api/User/refresh-token`,
      { refreshToken },
    );
    const newToken: string = data.token ?? data.accessToken;
    const expiresAt = Date.now() + (data.tokenExpiresIn ?? 3600) * 1000;

    localStorage.setItem('token', newToken);
    localStorage.setItem('refreshToken', data.refreshToken ?? refreshToken);
    localStorage.setItem('accessTokenExpiresAt', String(expiresAt));

    axios.defaults.headers.common.Authorization = `Bearer ${newToken}`;
    // Deliberately NOT markOnlineContact() here — a background refresh
    // succeeding mid-session isn't the student logging in, so it shouldn't
    // extend the 3-day offline-login clock either.
    return 'success';
  } catch (error) {
    // No response at all (or navigator says we're offline) means this never
    // reached the backend — a connectivity problem, not proof the refresh
    // token is invalid. Don't treat it the same as a real rejection.
    return isNetworkFailure(error) ? 'network-error' : 'rejected';
  }
};

export const useTokenRefresh = () => {
  useEffect(() => {
    const check = async () => {
      const expiresAt = Number(localStorage.getItem('accessTokenExpiresAt'));
      const refreshToken = localStorage.getItem('refreshToken');

      if (!expiresAt || !refreshToken) return;

      const isExpired = Date.now() >= expiresAt;

      if (!isExpired) return;

      if (isIdle()) {
        logOutAndRedirect();
        return;
      }

      const outcome = await attemptTokenRefresh();
      if (outcome === 'success') return;

      if (outcome === 'network-error') {
        // Offline (or a transient connectivity blip) — as long as we've had
        // confirmed online contact within the last 3 days, stay logged in
        // and just try again on the next interval instead of logging out.
        if (!isWithinOfflineGrace()) {
          logOutAndRedirect();
        }
        return;
      }

      // 'rejected' — the backend actually said no (refresh token invalid or
      // revoked). That's a real invalidation, not a connectivity issue, so
      // log out regardless of the offline grace period.
      logOutAndRedirect();
    };

    const handleActivity = () => {
      localStorage.setItem(ACTIVITY_TIMESTAMP_KEY, String(Date.now()));
    };

    window.addEventListener('mousedown', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity, { passive: true });
    window.addEventListener('touchstart', handleActivity, { passive: true });
    window.addEventListener('scroll', handleActivity, { passive: true });

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, []);
};
