import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PRESET_PACKAGES } from "@/lib/packages";

export const PROJECT_NAME_PRESETS = [
  "Wedding + Reception", "Wedding + Eve", "Save The Date", "Engagement", "Temple Shoot", "Haldi / Mehndi",
];

export type BookingPackage = { id: string; name: string; amount: number; items: string[] };
export const BOOKING_PACKAGES: BookingPackage[] = [
  { id: "wedding-essential", name: "Wedding Essential (Photography only)", amount: 25000, items: ["Wedding photography"] },
  { id: "standard-combo", name: "Standard Combo (Photo + Video + 60p Album)", amount: 35000, items: ["Wedding photography", "Wedding videography", "60 page album"] },
  { id: "premium-full", name: "Premium Full Coverage (Photo + Video + Teaser + 60p Album)", amount: 50000, items: ["Wedding photography", "Wedding videography", "Teaser video", "60 page album"] },
];

/** Applied on deliberate selection only; later negotiated prices are never re-derived. */
export function packageSelection(p: BookingPackage) {
  return { package_name: p.name, total_amount: Number(p.amount), deliverables: [...p.items] };
}

export function useBookingNamePresets() {
  return useQuery({
    queryKey: ["booking_name_presets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("booking_name_presets").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useBookingPackages() {
  return useQuery({
    queryKey: ["booking_package_templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("booking_package_templates").select("*").order("created_at");
      if (error) throw error;
      return data.map((p): BookingPackage => ({ ...p, amount: Number(p.amount), items: Array.isArray(p.items) ? p.items.map(String) : [] }));
    },
  });
}

export const LEGACY_BOOKING_PACKAGES: BookingPackage[] = PRESET_PACKAGES.map((p) => ({ ...p, name: p.label }));