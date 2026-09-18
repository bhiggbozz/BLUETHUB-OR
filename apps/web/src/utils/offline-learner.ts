import { addOfflineLearner, getOfflineLearnerByUsername } from "./db";



const OFFLINE_TOKEN_KEY = 'token';
const OFFLINE_USER_KEY = 'offline_auth_user';

// ---------- fake token ----------
function generateFakeToken(username: string): string {
  const payload = {
    username,
    iat: Date.now(),
    // not cryptographically meaningful — just makes each token unique/traceable
    rand: Math.random().toString(36).slice(2),
  };
  // base64-encode so it at least *looks* like a JWT-ish opaque token
  return btoa(JSON.stringify(payload));
}

function setOfflineSession(username: string, learnerId: string, roleName: string) {
  const token = generateFakeToken(username);
  const OfflineUser = true
  localStorage.setItem(OFFLINE_TOKEN_KEY, token);
  localStorage.setItem(
    OFFLINE_USER_KEY,
    JSON.stringify({ id: learnerId, username, roleName, OfflineUser }) // roleName added here
  );
  return token;
}

// ---------- register ----------
export const offlineRegister = async ({
  username,
  hashPassword,
}: {
  username: string;
  hashPassword: string;
}) => {
  const id = `idx-${new Date().toISOString().split('T')[0]}-${username}`;
  const result = await addOfflineLearner({ id, username, hashPassword });

  if (!result.success) return result;

//   const token = setOfflineSession(username, id);
  return { ...result, };
};

// ---------- login ----------
export const offlineLogin = async ({
  username,
  hashPassword,
}: {
  username: string;
  hashPassword: string;
}) => {
  const learner = await getOfflineLearnerByUsername(username);

  if (!learner) {
    return { success: false, error: 'No account found for this username' };
  }

  if (learner.hashPassword !== hashPassword) {
    return { success: false, error: 'Incorrect password' };
  }

  const token = setOfflineSession(username, learner.id, 'Student');
  return { success: true, data: learner, token };
};

// ---------- helpers ----------
export function getOfflineToken(): string | null {
  return localStorage.getItem(OFFLINE_TOKEN_KEY);
}

export function getOfflineUser(): { id: string; username: string; roleName?: string; OfflineUser: boolean } | null {
  const raw = localStorage.getItem(OFFLINE_USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function offlineLogout() {
  localStorage.removeItem(OFFLINE_TOKEN_KEY);
  localStorage.removeItem(OFFLINE_USER_KEY);
}

export function isOfflineAuthenticated(): boolean {
  return !!getOfflineToken();
}