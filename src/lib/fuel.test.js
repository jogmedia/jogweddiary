import { describe, expect, test } from "bun:test";
import { isFuelCategory, summarizeFuel } from "./fuel";

const rows = [
  { category: "Fuel / Petrol", expense_date: "2026-11-02", amount: 1000, project_id: "p1" },
  { category: "Fuel / Petrol", expense_date: "2026-11-03", amount: 500, project_id: null },
  { category: "Fuel / Petrol", expense_date: "2026-10-20", amount: 700, project_id: null },
  { category: "Album Cost & Printing", expense_date: "2026-11-02", amount: 9000, project_id: "p1" },
];

describe("fuel log", () => {
  test("only fuel categories count", () => {
    expect(isFuelCategory("Fuel / Petrol")).toBe(true);
    expect(isFuelCategory("Album Cost & Printing")).toBe(false);
  });
  test("month totals split project vs personal", () => {
    const s = summarizeFuel(rows, "2026-11");
    expect([s.total, s.project, s.personal, s.count]).toEqual([1500, 1000, 500, 2]);
  });
  test("year filter and personal-only list", () => {
    const s = summarizeFuel(rows, "2026", "personal");
    expect(s.total).toBe(2200);
    expect(s.list.map((r) => r.amount)).toEqual([500, 700]);
  });
});
