import { localISO, todayISO } from "@/lib/format";
import type { FixedDeposit } from "@/lib/db";

/** Adds months + days to a YYYY-MM-DD date and returns a local ISO date. */
export function addTenure(startISO: string, months: number, days: number) {
  const [y, m, d] = startISO.split("-").map(Number);
  if (!y || !m || !d) return startISO;
  const dt = new Date(y, m - 1, d);
  dt.setMonth(dt.getMonth() + (Number(months) || 0));
  dt.setDate(dt.getDate() + (Number(days) || 0));
  return localISO(dt);
}

/** Simple-interest maturity value used as a helpful default. */
export function estimateMaturity(principal: number, rate: number, months: number, days: number) {
  const years = (Number(months) || 0) / 12 + (Number(days) || 0) / 365;
  const value = Number(principal || 0) * (1 + (Number(rate) || 0) / 100 * years);
  return Math.round(value * 100) / 100;
}

/** Whole days from today until the given date (negative when already past). */
export function daysUntil(dateISO: string) {
  const [y, m, d] = dateISO.split("-").map(Number);
  const target = new Date(y, (m || 1) - 1, d || 1).getTime();
  const [ty, tm, td] = todayISO().split("-").map(Number);
  const today = new Date(ty, tm - 1, td).getTime();
  return Math.round((target - today) / 86400000);
}

export type FdState = "overdue" | "due-soon" | "upcoming" | "closed";

export function fdState(fd: FixedDeposit): FdState {
  if (fd.status === "closed") return "closed";
  const left = daysUntil(fd.maturity_date);
  if (left <= 0) return "overdue";
  if (left <= 15) return "due-soon";
  return "upcoming";
}

export const isActive = (fd: FixedDeposit) => fd.status !== "closed";

export const countdownLabel = (dateISO: string) => {
  const left = daysUntil(dateISO);
  if (left === 0) return "matures today";
  if (left < 0) return `${Math.abs(left)} day${Math.abs(left) === 1 ? "" : "s"} overdue`;
  return `${left} day${left === 1 ? "" : "s"} left`;
};
