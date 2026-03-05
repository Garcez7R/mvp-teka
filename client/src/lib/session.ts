const USER_ID_KEY = "teka_auth_user_id";

export function getSessionUserId(): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_ID_KEY);
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function setSessionUserId(userId: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_ID_KEY, String(userId));
}

export function clearSessionUserId() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(USER_ID_KEY);
}
