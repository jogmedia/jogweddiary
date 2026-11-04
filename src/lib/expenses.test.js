import { expect, test } from "bun:test";
import { categoryTotals, isPersonalCategory, kindOf, splitKinds } from "./expenses";

test("personal sub-categories are recognised", () => {
  expect(isPersonalCategory("Groceries & Vegetables")).toBe(true);
  expect(isPersonalCategory("Food & Dining / Snacks")).toBe(true);
  expect(isPersonalCategory("Album Cost & Printing")).toBe(false);
});

test("kindOf: explicit column wins, legacy categories fall back", () => {
  expect(kindOf({ expense_kind: "personal", category: "Fuel / Petrol" })).toBe("personal");
  expect(kindOf({ expense_kind: "studio", category: "Groceries & Vegetables" })).toBe("studio");
  expect(kindOf({ category: "Medical & Healthcare" })).toBe("personal");
  expect(kindOf({ category: "Fuel / Petrol" })).toBe("studio");
  expect(kindOf(null)).toBe("studio");
});

test("splitKinds separates studio profit costs from living expenses", () => {
  const rows = [
    { amount: 5000, category: "Fuel / Petrol", expense_kind: "studio" },
    { amount: 800, category: "Groceries & Vegetables", expense_kind: "personal" },
    { amount: 300, category: "Others / Miscellaneous" },
  ];
  expect(splitKinds(rows)).toEqual({ studio: 5000, personal: 1100 });
});

test("categoryTotals sums per category, highest first", () => {
  const rows = [
    { amount: 1000, category: "Fuel / Petrol" },
    { amount: 400, category: "Food & Dining / Snacks" },
    { amount: 600, category: "Fuel / Petrol" },
  ];
  expect(categoryTotals(rows)[0]).toEqual({ category: "Fuel / Petrol", amount: 1600 });
});
