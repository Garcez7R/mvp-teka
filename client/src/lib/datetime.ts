export function parseDateValue(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    const dateFromNumber = new Date(value);
    return Number.isNaN(dateFromNumber.getTime()) ? null : dateFromNumber;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) {
      const dateFromNumeric = new Date(numeric);
      if (!Number.isNaN(dateFromNumeric.getTime())) return dateFromNumeric;
    }

    const dateFromString = new Date(trimmed);
    return Number.isNaN(dateFromString.getTime()) ? null : dateFromString;
  }

  return null;
}

export function formatDateTimePtBr(value: unknown): string {
  const parsed = parseDateValue(value);
  return parsed ? parsed.toLocaleString("pt-BR") : "-";
}

export function formatDatePtBr(value: unknown): string {
  const parsed = parseDateValue(value);
  return parsed ? parsed.toLocaleDateString("pt-BR") : "-";
}
