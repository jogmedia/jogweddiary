/** Bank / cash accounts money can land in. */
export const PAY_ACCOUNTS = [
  { value: "gpay_phonepe_hdfc", label: "GPay / PhonePe (HDFC Bank)", mode: "upi" },
  { value: "hdfc_transfer", label: "HDFC Bank (Direct Transfer)", mode: "bank" },
  { value: "sbi_account", label: "SBI Bank Account", mode: "bank" },
  { value: "cash_in_hand", label: "Cash in Hand", mode: "cash" },
  { value: "other_account", label: "Other Account", mode: "bank" },
];

export const accountLabel = (value?: string | null) =>
  PAY_ACCOUNTS.find((a) => a.value === value)?.label ?? (value ? value.replace(/_/g, " ") : "Unassigned");

export const modeForAccount = (value?: string | null) =>
  PAY_ACCOUNTS.find((a) => a.value === value)?.mode ?? "cash";

/** Reference marker used for the auto-created advance payment entry. */
export const ADVANCE_REF = "ADVANCE";

export type Balance = { account: string; label: string; received: number; count: number };

export function accountBalances(payments: { amount: number; account?: string | null }[]): Balance[] {
  const map = new Map<string, Balance>();
  for (const a of PAY_ACCOUNTS) map.set(a.value, { account: a.value, label: a.label, received: 0, count: 0 });
  for (const p of payments) {
    const key = p.account ?? "unassigned";
    if (!map.has(key)) map.set(key, { account: key, label: accountLabel(key), received: 0, count: 0 });
    const row = map.get(key)!;
    row.received += Number(p.amount ?? 0);
    row.count += 1;
  }
  return [...map.values()];
}
