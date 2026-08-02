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

/** Local-date ISO (YYYY-MM-DD) — avoids UTC shift from toISOString(). */
export const localISO = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const todayISO = () => localISO();

/** Local ISO date offset by N days from today. */
export const dayOffsetISO = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return localISO(d);
};

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

/** Normalises an Indian/international phone number into a wa.me-ready number (no +, with country code). */
export const waNumber = (v: string | null | undefined) => {
  let s = (v ?? "").replace(/[^\d+]/g, "");
  if (!s) return "";
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  if (s.startsWith("+")) return s.slice(1).replace(/\D/g, "");
  s = s.replace(/\D/g, "");
  if (s.length === 10) return `91${s}`; // bare Indian mobile
  if (s.length === 11 && s.startsWith("0")) return `91${s.slice(1)}`;
  if (s.length === 12 && s.startsWith("91")) return s;
  return s;
};

/** Pretty display form: +91 98765 43210 */
export const fmtPhone = (v: string | null | undefined) => {
  const n = waNumber(v);
  if (!n) return "—";
  if (n.startsWith("91") && n.length === 12) return `+91 ${n.slice(2, 7)} ${n.slice(7)}`;
  return `+${n}`;
};

export const isValidPhone = (v: string | null | undefined) => {
  const n = waNumber(v);
  return n.length >= 10 && n.length <= 15;
};

export const isMapsUrl = (v: string | null | undefined) => {
  const s = (v ?? "").trim();
  if (!s) return true;
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
};

