/** Standard split between studio/business spend and the owner's personal spend. */
export type ExpenseKind = "studio" | "personal";

export const EXPENSE_KIND_OPTIONS = [
  { value: "studio", label: "🏢 Studio / Business" },
  { value: "personal", label: "🏠 Personal / Home" },
] as const;

/** Sub-categories offered when an expense is Personal / Home. */
export const PERSONAL_CATEGORIES = [
  { value: "Groceries & Vegetables", label: "Groceries & Vegetables (പച്ചക്കറി / പലചരക്ക്)" },
  { value: "Food & Dining / Snacks", label: "Food & Dining / Snacks" },
  { value: "Home Utilities & Maintenance", label: "Home Utilities & Maintenance" },
  { value: "Family / Personal Shopping", label: "Family / Personal Shopping" },
  { value: "Medical & Healthcare", label: "Medical & Healthcare" },
  { value: "Others / Miscellaneous", label: "Others / Miscellaneous" },
];

export const isPersonalCategory = (c?: string | null) =>
  PERSONAL_CATEGORIES.some((p) => p.value.toLowerCase() === String(c ?? "").trim().toLowerCase());

export const OWNER_DRAW = "Owner Salary / Personal Draw";

/**
 * Effective kind of an expense. New rows carry `expense_kind`; legacy rows
 * fall back to the personal sub-categories, everything else counts as studio.
 */
export const kindOf = (e: { expense_kind?: string | null; category?: string | null } | null | undefined): ExpenseKind => {
  const k = String(e?.expense_kind ?? "").toLowerCase();
  if (k === "personal" || k === "studio") return k as ExpenseKind;
  return isPersonalCategory(e?.category) ? "personal" : "studio";
};

/** Sums a list of expenses into studio vs personal totals. */
export function splitKinds(rows: { amount: number | string; category?: string | null; expense_kind?: string | null }[]) {
  let studio = 0;
  let personal = 0;
  rows.forEach((r) => {
    const a = Number(r.amount || 0);
    if (kindOf(r) === "personal") personal += a;
    else studio += a;
  });
  return { studio, personal };
}

/** Totals per category (any kind), sorted highest first. */
export function categoryTotals(rows: { amount: number | string; category?: string | null }[]) {
  const map = new Map<string, number>();
  rows.forEach((r) => {
    const c = String(r.category ?? "—").trim() || "—";
    map.set(c, (map.get(c) ?? 0) + Number(r.amount || 0));
  });
  return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([category, amount]) => ({ category, amount }));
}
