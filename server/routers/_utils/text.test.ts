import { describe, expect, it } from "vitest";
import { normalizeBookTitle, toTitleCase } from "./text";

describe("text utils", () => {
  it("formats title with initial uppercase words", () => {
    expect(toTitleCase("o trono vazio volume 8")).toBe("O Trono Vazio Volume 8");
  });

  it("normalizes book title safely", () => {
    expect(normalizeBookTitle("  as crônicas de nárnia ")).toBe("As Crônicas De Nárnia");
    expect(normalizeBookTitle(undefined)).toBeUndefined();
  });
});
