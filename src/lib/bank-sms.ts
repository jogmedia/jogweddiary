/** Parses a bank debit SMS into amount + recipient. Shared so webhook and tests use identical rules. */
export function parseBankSms(message: string): { amount: number | null; payee: string | null } {
  const text = message.replace(/\s+/g, " ").trim();
  const amtMatch =
    text.match(/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i) ??
    text.match(/debited\s+(?:by|for|with)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  const amount = amtMatch ? Number(amtMatch[1].replace(/,/g, "")) : NaN;

  let payee: string | null = null;
  const vpa = text.match(/vpa\s*[:\-]?\s*([\w.\-]+@[\w.\-]+)/i);
  const to = text.match(/\bto\s*[:\-]?\s*([A-Za-z0-9@&.\-' ]{2,40}?)(?=\s+(?:on|ref|upi|avl|avbl|a\/c|from|via|-)\b|[.,;]|$)/i);
  if (to && !/^(a\/c|your|ac)\b/i.test(to[1].trim())) payee = to[1].trim();
  else if (vpa) payee = vpa[1];

  return { amount: Number.isFinite(amount) && amount > 0 ? amount : null, payee: payee || null };
}
