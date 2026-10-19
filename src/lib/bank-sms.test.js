import { expect, test } from "bun:test";
import { parseBankSms } from "./bank-sms";

test("parses Rs amount and payee after 'to'", () => {
  const r = parseBankSms("Rs.1,250.50 debited from A/c XX1234 to SWIGGY on 19-10-26. Ref 1234");
  expect(r.amount).toBe(1250.5);
  expect(r.payee).toBe("SWIGGY");
});

test("parses INR amount and VPA", () => {
  const r = parseBankSms("INR 500 debited from your account. VPA shop@okaxis Ref 99");
  expect(r.amount).toBe(500);
  expect(r.payee).toBe("shop@okaxis");
});

test("no payee returns null so webhook uses GPay Expense", () => {
  expect(parseBankSms("Your a/c debited Rs 300").payee).toBeNull();
});
