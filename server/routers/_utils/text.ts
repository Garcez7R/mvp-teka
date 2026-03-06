export function toTitleCase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/(^|[\s\-_/([{"'])(([a-z\u00c0-\u024f0-9]))/g, (match) =>
      match.toUpperCase()
    );
}

export function normalizeBookTitle(value?: string | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = toTitleCase(value);
  return normalized || undefined;
}
