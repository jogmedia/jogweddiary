import { useCallback, useMemo, useState } from "react";
import { useExpenses } from "@/lib/db";

/** Default wedding-media expense categories. */
export const DEFAULT_EXPENSE_CATEGORIES = [
  "Editing Expense (Video / Traditional)",
  "Save the Date Color Grading",
  "Reels / Teaser Editing",
  "Album Cost & Printing",
  "Staff & Freelance Bata (Cameraman / Drone Pilot)",
  "Equipment Rent & Purchase",
  "Travel & Fuel",
  "Food & Accommodation",
  "Owner Salary / Personal Draw",
  "Studio Overheads (Rent, Electricity, Subscriptions)",
  "Expossing Charge for Video",
  "Expossing Charge for Photo",
  "Other",
];

const KEY = "jog.expense-categories";

const readCustom = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
};

const writeCustom = (list: string[]) => {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
};

/**
 * Category list = defaults + categories already used in saved expenses +
 * locally added custom categories. Newly created categories become permanent
 * once an expense is saved with them.
 */
export function useExpenseCategories() {
  const { data: expenses = [] } = useExpenses();
  const [custom, setCustom] = useState<string[]>(() => readCustom());

  const options = useMemo(() => {
    const seen = new Map<string, string>();
    const push = (v?: string | null) => {
      const name = String(v ?? "").trim();
      if (!name) return;
      const k = name.toLowerCase();
      if (!seen.has(k)) seen.set(k, name);
    };
    DEFAULT_EXPENSE_CATEGORIES.forEach(push);
    expenses.forEach((e: any) => push(e.category));
    custom.forEach(push);
    const all = [...seen.values()];
    // keep "Other" last
    const other = all.filter((v) => v.toLowerCase() === "other");
    const rest = all.filter((v) => v.toLowerCase() !== "other");
    return [...rest, ...other].map((v) => ({ value: v, label: v }));
  }, [expenses, custom]);

  const addCategory = useCallback((raw: string) => {
    const name = raw.trim();
    if (!name) return null;
    setCustom((prev) => {
      if (prev.some((v) => v.toLowerCase() === name.toLowerCase())) return prev;
      const next = [...prev, name];
      writeCustom(next);
      return next;
    });
    return name;
  }, []);

  return { options, addCategory };
}
