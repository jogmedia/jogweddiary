import { describe, expect, test } from "bun:test";
import { bookingPaymentSchedule, confirmationFunctionName, uniqueConfirmationValues } from "./booking-confirmation";

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
});