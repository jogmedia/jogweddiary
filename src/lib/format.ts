export const inr = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(n ?? 0));

export const inrShort = (n: number | null | undefined) => {
  const v = Number(n ?? 0);
  if (Math.abs(v) >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`;
  if (Math.abs(v) >= 100000) return `₹${(v / 100000).toFixed(2)}L`;
  if (Math.abs(v) >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v.toFixed(0)}`;
};

export const fmtDate = (d: string | null | undefined) => {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const monthStartISO = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

export const yearStartISO = () => {
  const d = new Date();
  return new Date(d.getFullYear(), 0, 1).toISOString().slice(0, 10);
};

export const monthKey = (d: string) => d.slice(0, 7);

export const monthLabel = (key: string) => {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-IN", {
    month: "short",
    year: "2-digit",
  });
};

export const sum = <T,>(rows: T[], pick: (r: T) => number | null | undefined) =>
  rows.reduce((acc, r) => acc + Number(pick(r) ?? 0), 0);

export const digitsOnly = (v: string | null | undefined) => (v ?? "").replace(/[^\d+]/g, "");
