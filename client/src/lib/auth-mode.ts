function normalizeFlag(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export function isGoogleAuthEnabled() {
  const explicit = normalizeFlag(import.meta.env.VITE_AUTH_GOOGLE_ENABLED);
  if (explicit === "false" || explicit === "0" || explicit === "off" || explicit === "no") {
    return false;
  }
  return true;
}
