import { describe, expect, it } from "vitest";
import {
  formatCurrencyFromDigits,
  parseCurrencyBRLToNumber,
  sanitizeFetchedDescription,
} from "./book-form";

describe("book-form utils", () => {
  it("removes Source title prefix from fetched description", () => {
    const input =
      "Source title: O Trono Vazio - Volume 8 (Em Portuguese do Brasil)\nUma história épica.";
    expect(sanitizeFetchedDescription(input)).toBe("Uma história épica.");
  });

  it("formats numeric input as BRL currency text", () => {
    expect(formatCurrencyFromDigits("1234")).toBe("12,34");
    expect(formatCurrencyFromDigits("001")).toBe("0,01");
  });

  it("parses BRL formatted currency into number", () => {
    expect(parseCurrencyBRLToNumber("1.234,56")).toBe(1234.56);
    expect(Number.isNaN(parseCurrencyBRLToNumber("abc"))).toBe(true);
  });
});
