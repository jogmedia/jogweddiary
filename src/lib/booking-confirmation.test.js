import { describe, expect, test } from "bun:test";
import { bookingPaymentSchedule, buildBookingConfirmation, buildEventCoverage, confirmationFunctionName, uniqueConfirmationValues } from "./booking-confirmation";

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
  test("a renamed sub-event title overrides the preset label everywhere", () => {
    const renamed = { event_label: "Groom's Reception", event_type: "reception" };
    expect(confirmationFunctionName(renamed, [{ slug: "reception", label: "Reception" }])).toBe("Groom's Reception");
    const coverage = buildEventCoverage(
      [{ id: "e1", event_label: "Groom's Reception", event_type: "reception", event_date: "2026-12-20" }],
      [],
      ["Wedding photography"],
    );
    expect(coverage[0]?.eventName).toBe("Groom's Reception");
  });
  test("duplicate venues ignore whitespace and casing", () => {
    expect(uniqueConfirmationValues([" PANTHEERANKAV ", "pantheerankav", "", null])).toEqual(["PANTHEERANKAV"]);
  });
  test("event coverage counts assigned roles and never includes crew names", () => {
    const coverage = buildEventCoverage(
      [{ id: "e1", event_type: "wedding_day", event_date: "2026-12-19" }],
      [
        { event_id: "e1", staff_id: "s1", role_in_project: "Traditional Photographer", staff: { name: "Vipin", role: "photographer" } },
        { event_id: "e1", staff_id: "s2", role_in_project: "Traditional Photographer", staff: { name: "Diljith", role: "photographer" } },
        { event_id: "e1", staff_id: "s3", role_in_project: "Traditional Videographer", staff: { name: "Sajeesh", role: "videographer" } },
        { event_id: "e1", staff_id: "s4", role_in_project: "Drone Operator", staff: { name: "Crew Member", role: "drone" } },
      ],
      [],
      [{ slug: "wedding_day", label: "Wedding Day / Muhurtham" }],
    );
    expect(coverage[0]?.roles).toEqual([
      { label: "Traditional Photographer", count: 2 },
      { label: "Traditional Videographer", count: 1 },
      { label: "Drone Pilot", count: 1 },
    ]);
    expect(JSON.stringify(coverage)).not.toMatch(/Vipin|Diljith|Sajeesh/);
  });
  test("project-wide assignments cover events and package deliverables provide the fallback", () => {
    const shared = buildEventCoverage(
      [{ id: "e1", event_type: "wedding_day", event_date: "2026-12-19" }],
      [{ event_id: null, staff_id: "s1", role_in_project: "Candid Photographer" }],
      ["Full HD Video", "Drone coverage"],
    );
    expect(shared[0]?.roles).toEqual([{ label: "Candid Photographer", count: 1 }]);
    const planned = buildEventCoverage(
      [{ id: "e2", event_type: "reception", event_date: "2026-12-20" }],
      [],
      ["Wedding photography", "Full HD Video"],
    );
    expect(planned[0]?.roles).toEqual([
      { label: "Traditional Photographer", count: 1 },
      { label: "Traditional Videographer", count: 1 },
    ]);
  });
  test("booking message renders event coverage while preserving names privacy", () => {
    const message = buildBookingConfirmation({
      clientName: "Anjali",
      dates: ["2026-12-19"],
      functions: ["Wedding"],
      venues: ["Pantheerankav"],
      deliverables: ["Album"],
      eventCoverage: [{ eventName: "Wedding", eventDate: "2026-12-19", roles: [{ label: "Traditional Photographer", count: 1 }] }],
      total: 40000,
      advance: 3000,
      balance: 37000,
    });
    expect(message).toContain("🗓️ *Event Schedule & Coverage Breakdown:*");
    expect(message).toContain("▪︎ *Wedding* (19 Dec 2026)\n   - 1 Traditional Photographer");
    expect(message).not.toContain("Vipin");
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