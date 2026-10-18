import { describe, expect, test } from "bun:test";
import { bookingPaymentSchedule, buildBookingConfirmation, confirmationFunctionName, uniqueConfirmationValues } from "./booking-confirmation";

describe("booking confirmation data", () => {
  test("wedding-day payment reaches 90% after received advance", () => {
    expect(bookingPaymentSchedule(42000, 5000).weddingDayPayable).toBe(32800);
  });
  test("album delivery reserves 10% of the agreed total", () => {
    expect(bookingPaymentSchedule(42000, 5000).albumDeliveryPayable).toBe(4200);
  });
  test("custom events retain their actual function name", () => {
    expect(confirmationFunctionName({ event_type: "custom", notes: "Wedding + Reception" })).toBe("Wedding + Reception");
  });
  test("only an empty custom name falls back to Custom event", () => {
    expect(confirmationFunctionName({ event_type: "custom", notes: "  " })).toBe("Custom event");
  });
  test("selected studio event titles take precedence", () => {
    expect(confirmationFunctionName({ event_type: "wedding_day" }, [{ slug: "wedding_day", label: "Wedding" }])).toBe("Wedding");
  });
  test("duplicate venues ignore whitespace and casing", () => {
    expect(uniqueConfirmationValues([" PANTHEERANKAV ", "pantheerankav", "", null])).toEqual(["PANTHEERANKAV"]);
  });
  test("payment block lists balance payable then the split schedule", () => {
    const text = buildBookingConfirmation({
      clientName: "Anjali",
      dates: [],
      functions: ["Wedding"],
      venues: ["Pantheerankav"],
      deliverables: ["2 albums"],
      total: 40000,
      advance: 3000,
      balance: 37000,
    });
    const block = text.slice(text.indexOf("💰"));
    expect(block.split("\n").slice(0, 8)).toEqual([
      "💰 *Payment Details:*",
      "• Total Agreed Amount: ₹40,000",
      "• Advance Received: ₹3,000 (Confirmed)",
      "• Total Balance Payable: ₹37,000",
      "───────────────────────",
      "*📋 Balance Payment Schedule:*",
      "• *On Wedding Day (90% Completion):* ₹33,000",
      "• *On Album Printing & Delivery (Balance):* ₹4,000",
    ]);
  });
});