export function sanitizeFetchedDescription(value?: string | null): string | undefined {
  if (typeof value !== "string") return undefined;

  const cleaned = value
    .replace(/source\s*title\s*:[^\n\r]*/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return cleaned || undefined;
}

export function formatCurrencyFromDigits(raw: string): string {
  const digitsOnly = raw.replace(/\D/g, "");
  if (!digitsOnly) return "";

  const cents = Number.parseInt(digitsOnly, 10);
  if (!Number.isFinite(cents)) return "";

  const value = cents / 100;
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseCurrencyBRLToNumber(raw: string): number {
  const normalized = raw.replace(/\./g, "").replace(",", ".").trim();
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : NaN;
}
