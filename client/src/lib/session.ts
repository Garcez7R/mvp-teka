const TOKEN_KEY = "teka_auth_google_id_token";
const SIGNUP_ROLE_KEY = "teka_signup_role";

export function getSessionIdToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setSessionIdToken(idToken: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, idToken);
}

export function clearSessionIdToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
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
