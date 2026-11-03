/** Standard fuel category shared by every expense form. */
export const FUEL_CATEGORY = "Fuel / Petrol";

export const FUEL_MODES = [
  { value: "upi", label: "GPay / UPI" },
  { value: "bank", label: "Bank" },
  { value: "cash", label: "Cash" },
];

/** True for the standard fuel category and older petrol/diesel labels. */
export const isFuelCategory = (c?: string | null) => {
  const v = String(c ?? "").trim().toLowerCase();
  return v === FUEL_CATEGORY.toLowerCase() || /\b(petrol|diesel)\b/.test(v) || v === "fuel";
};

export type FuelFilter = "all" | "project" | "personal";

type Row = { category?: string | null; expense_date: string; amount: number | string; project_id?: string | null };

/** Fuel rows within a "YYYY-MM" month (or "YYYY" year), split by type. */
export function summarizeFuel<T extends Row>(rows: T[], period: string, filter: FuelFilter = "all") {
  const inPeriod = rows.filter((r) => isFuelCategory(r.category) && r.expense_date.startsWith(period));
  const sum = (xs: T[]) => xs.reduce((a, r) => a + Number(r.amount || 0), 0);
  const project = inPeriod.filter((r) => !!r.project_id);
  const personal = inPeriod.filter((r) => !r.project_id);
  const list = filter === "project" ? project : filter === "personal" ? personal : inPeriod;
  return {
    total: sum(inPeriod),
    project: sum(project),
    personal: sum(personal),
    count: inPeriod.length,
    list: [...list].sort((a, b) => b.expense_date.localeCompare(a.expense_date)),
  };
}
