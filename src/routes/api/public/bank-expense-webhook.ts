import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { parseBankSms } from "@/lib/bank-sms";

const Body = z.object({ message: z.string().min(5).max(1000) });

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export const Route = createFileRoute("/api/public/bank-expense-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.BANK_WEBHOOK_KEY;
        const url = new URL(request.url);
        const given = request.headers.get("x-webhook-key") ?? url.searchParams.get("key") ?? "";
        if (!secret || !safeEqual(given, secret)) {
          return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }
        let json: unknown;
        try {
          json = await request.json();
        } catch {
          return Response.json({ success: false, error: "Invalid JSON" }, { status: 400 });
        }
        const parsed = Body.safeParse(json);
        if (!parsed.success) return Response.json({ success: false, error: "message required" }, { status: 400 });

        const { amount, payee } = parseBankSms(parsed.data.message);
        if (!amount) return Response.json({ success: false, error: "Amount not found" }, { status: 422 });

        const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.from("project_expenses").insert({
          amount,
          category: "UPI / Studio Expense",
          expense_date: today,
          payment_mode: "upi",
          paid_to: payee ?? "GPay Expense",
          notes: payee ? `UPI to ${payee} (auto from SMS)` : "GPay Expense",
        });
        if (error) {
          console.error(error);
          return Response.json({ success: false, error: "Save failed" }, { status: 500 });
        }
        return Response.json({ success: true, amount });
      },
    },
  },
});
