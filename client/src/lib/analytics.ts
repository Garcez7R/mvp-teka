type EventPayload = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, string | number | boolean> }) => void;
  }
}

export function trackEvent(event: string, payload?: EventPayload) {
  const safePayload = payload
    ? Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined))
    : undefined;

  if (import.meta.env.DEV) {
    console.info("[analytics]", event, safePayload ?? {});
  }

  if (typeof window !== "undefined" && typeof window.plausible === "function") {
    const props = safePayload
      ? (Object.fromEntries(
          Object.entries(safePayload).map(([key, value]) => [key, value === null ? "null" : value])
        ) as Record<string, string | number | boolean>)
      : undefined;
    window.plausible(event, props ? { props } : undefined);
  }
}
