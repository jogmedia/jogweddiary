import { describe, expect, test } from "bun:test";
import { BOOKING_PACKAGES, packageSelection } from "./booking-presets";

describe("booking package prices", () => {
  test("Wedding Essential fills ₹25,000", () => {
    expect(packageSelection(BOOKING_PACKAGES[0]).total_amount).toBe(25000);
  });
  test("Standard Combo fills ₹35,000 and its album deliverable", () => {
    expect(packageSelection(BOOKING_PACKAGES[1])).toEqual({ package_name: "Standard Combo (Photo + Video + 60p Album)", total_amount: 35000, deliverables: ["Wedding photography", "Wedding videography", "60 page album"] });
  });
  test("Premium Full Coverage fills ₹50,000", () => {
    expect(packageSelection(BOOKING_PACKAGES[2]).total_amount).toBe(50000);
  });
  test("custom template preserves its configured base price and deliverables", () => {
    expect(packageSelection({ id: "custom", name: "Temple Combo", amount: 18000, items: ["Temple photography"] })).toEqual({ package_name: "Temple Combo", total_amount: 18000, deliverables: ["Temple photography"] });
  });
  test("edited deliverables cannot mutate the template", () => {
    const selected = packageSelection(BOOKING_PACKAGES[1]);
    selected.deliverables.push("Extra prints");
    expect(BOOKING_PACKAGES[1].items).toEqual(["Wedding photography", "Wedding videography", "60 page album"]);
  });
});