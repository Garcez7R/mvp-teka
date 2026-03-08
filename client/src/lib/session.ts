const TOKEN_KEY = "teka_auth_google_id_token";
const SIGNUP_ROLE_KEY = "teka_signup_role";
const TOKEN_ISSUED_AT_KEY = "teka_auth_issued_at";
const LEGACY_EMAIL_KEY = "teka_auth_legacy_email";
const LEGACY_NAME_KEY = "teka_auth_legacy_name";
export const SESSION_MAX_AGE_MS = 1000 * 60 * 60; // 1 hour

type GoogleTokenClaims = {
  sub?: string;
  email?: string;
  name?: string;
  exp?: number;
};

function decodeTokenClaims(token: string): GoogleTokenClaims | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const payloadJson = atob(padded);
    const payload = JSON.parse(payloadJson);
    return payload && typeof payload === "object" ? payload : null;
  } catch {
    return null;
  }
}

export function getSessionIdToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = window.localStorage.getItem(TOKEN_KEY);
  if (!token) return null;

  const claims = decodeTokenClaims(token);
  const expSeconds = Number(claims?.exp);
  const expMs = Number.isFinite(expSeconds) ? expSeconds * 1000 : NaN;
  const now = Date.now();

  // Primary source of truth for Google ID tokens.
  if (Number.isFinite(expMs) && now >= expMs) {
    clearSessionIdToken();
    return null;
  }

  const issuedAtRaw = window.localStorage.getItem(TOKEN_ISSUED_AT_KEY);
  const issuedAt = issuedAtRaw ? Number.parseInt(issuedAtRaw, 10) : NaN;
  // Backward compatibility for legacy sessions without exp claim handling.
  if (!Number.isFinite(issuedAt)) {
    window.localStorage.setItem(TOKEN_ISSUED_AT_KEY, String(now));
    return token;
  }

  const isExpiredByIssuedAt = now - issuedAt >= SESSION_MAX_AGE_MS;
  if (!Number.isFinite(expMs) && isExpiredByIssuedAt) {
    clearSessionIdToken();
    return null;
  }
  return token;
}

export function setSessionIdToken(idToken: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, idToken);
  window.localStorage.setItem(TOKEN_ISSUED_AT_KEY, String(Date.now()));
}

export function clearSessionIdToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(TOKEN_ISSUED_AT_KEY);
}

export function setLegacyEmailSession(params: { email: string; name?: string | null }) {
  if (typeof window === "undefined") return;
  const email = params.email.trim().toLowerCase();
  if (!email) return;
  window.localStorage.setItem(LEGACY_EMAIL_KEY, email);
  if (params.name && params.name.trim()) {
    window.localStorage.setItem(LEGACY_NAME_KEY, params.name.trim());
  } else {
    window.localStorage.removeItem(LEGACY_NAME_KEY);
  }
}

export function getLegacyEmailSession():
  | {
      email: string;
      name: string | null;
    }
  | null {
  if (typeof window === "undefined") return null;
  const email = (window.localStorage.getItem(LEGACY_EMAIL_KEY) || "").trim().toLowerCase();
  if (!email) return null;
  const nameRaw = (window.localStorage.getItem(LEGACY_NAME_KEY) || "").trim();
  return {
    email,
    name: nameRaw || null,
  };
}

export function clearLegacyEmailSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LEGACY_EMAIL_KEY);
  window.localStorage.removeItem(LEGACY_NAME_KEY);
}

export function setSignupRole(role: "livreiro" | "comprador") {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SIGNUP_ROLE_KEY, role);
}

export function getSignupRole(): "livreiro" | "comprador" | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SIGNUP_ROLE_KEY);
  return raw === "livreiro" || raw === "comprador" ? raw : null;
}

export function clearSignupRole() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SIGNUP_ROLE_KEY);
}

export function hasAnyAuthSession() {
  return Boolean(getSessionIdToken() || getLegacyEmailSession()?.email);
}

export function getGoogleTokenClaims(): GoogleTokenClaims | null {
  const token = getSessionIdToken();
  if (!token) return null;
  return decodeTokenClaims(token);
}
