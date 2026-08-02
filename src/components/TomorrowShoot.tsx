import { ShootDay } from "@/components/ShootDay";
import { dayOffsetISO } from "@/lib/format";

/** Kept for compatibility — renders tomorrow's shoots. */
export function TomorrowShoot() {
  return <ShootDay date={dayOffsetISO(1)} title="Tomorrow's Shoot" />;
}
