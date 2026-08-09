/** Preset packages & deliverables for JOG MEDIA. */

export type PresetPackage = {
  id: string;
  category: string;
  label: string;
  amount: number;
  items: string[];
};

const P = (
  id: string,
  category: string,
  amount: number,
  items: string[],
): PresetPackage => ({
  id,
  category,
  amount,
  label: `₹${amount.toLocaleString("en-IN")} — ${category}`,
  items,
});

export const PACKAGE_CATEGORIES = [
  "Photography (Single Side)",
  "Photography + Videography (Single Side)",
  "Both Side Photography",
  "Both Side Photography + Videography",
] as const;

export const PRESET_PACKAGES: PresetPackage[] = [
  P("photo-35000", "Photography (Single Side)", 35000, [
    "Wedding day",
    "Eve or Reception",
    "60 page album",
    "Mini book",
    "Calendar",
    "Photo frame",
    "Album bag",
    "Spl Luster pages",
  ]),
  P("photo-40000", "Photography (Single Side)", 40000, [
    "Save the date",
    "Wedding day",
    "Eve or Reception",
    "60 page album",
    "Mini book",
    "Calendar",
    "Photo frame",
    "Album bag",
    "Spl Luster pages",
  ]),
  P("photo-50000", "Photography (Single Side)", 50000, [
    "Save the date",
    "Wedding day",
    "Eve or Reception",
    "80 page album",
    "Spl Luster pages",
    "Mini book",
    "Calendar",
    "Photo frame",
    "Album bag",
  ]),
  P("pv-60000", "Photography + Videography (Single Side)", 60000, [
    "Wedding day",
    "Eve or Reception",
    "60 page album",
    "Mini book",
    "Calendar",
    "Photo frame",
    "Album bag",
    "Full HD video",
    "Highlight video",
    "Spl Luster pages",
  ]),
  P("pv-70000", "Photography + Videography (Single Side)", 70000, [
    "Save the date",
    "Wedding day",
    "Eve or Reception",
    "60 page album",
    "Spl Luster pages",
    "Mini book",
    "Calendar",
    "Photo frame",
    "Album bag",
    "Full HD video",
    "Highlight video",
  ]),
  P("pv-80000", "Photography + Videography (Single Side)", 80000, [
    "Save the date",
    "Wedding day",
    "Eve or Reception",
    "80 page album",
    "Spl Luster pages",
    "Mini book",
    "Calendar",
    "Photo frame",
    "Album bag",
    "Full HD video",
    "Highlight video",
  ]),
  P("both-photo-75000", "Both Side Photography", 75000, [
    "Save the date",
    "Wedding day",
    "Eve or Reception",
    "60 page album 2",
    "Spl Luster pages",
    "Mini book 2",
    "Calendar 2",
    "Photo frame 2",
    "Album bag 2",
  ]),
  P("both-photo-90000", "Both Side Photography", 90000, [
    "Save the date",
    "Wedding day",
    "Eve or Reception",
    "80 page album 2",
    "Spl Luster pages",
    "Mini book 2",
    "Calendar 2",
    "Photo frame 2",
    "Album bag 2",
  ]),
  P("both-photo-110000", "Both Side Photography", 110000, [
    "Save the date",
    "Wedding day",
    "Eve or Reception",
    "100 page album 2",
    "Spl Luster pages",
    "Mini book 2",
    "Calendar 2",
    "Photo frame 2",
    "Album box 2",
  ]),
  P("both-pv-110000", "Both Side Photography + Videography", 110000, [
    "Wedding day",
    "Eve or Reception",
    "60 page album 2",
    "Mini book 2",
    "Calendar 2",
    "Photo frame 2",
    "Album bag 2",
    "Full HD video 2",
    "Highlight video 2",
    "Spl Luster pages",
  ]),
  P("both-pv-120000", "Both Side Photography + Videography", 120000, [
    "Save the date",
    "Wedding day",
    "Eve or Reception",
    "60 page album 2",
    "Spl Luster pages",
    "Mini book 2",
    "Calendar 2",
    "Photo frame 2",
    "Album bag 2",
    "Full HD video 2",
    "Highlight video 2",
  ]),
  P("both-pv-140000", "Both Side Photography + Videography", 140000, [
    "Save the date",
    "Wedding day",
    "Eve or Reception",
    "100 page album 2",
    "Spl Luster pages",
    "Mini book 2",
    "Calendar 2",
    "Photo frame 2",
    "Album box 2",
    "Full HD video 2",
    "Highlight video 2",
  ]),
];

export const findPackage = (id?: string | null) =>
  PRESET_PACKAGES.find((p) => p.id === id) ?? null;

export const packageByName = (name?: string | null) =>
  PRESET_PACKAGES.find((p) => p.label === name) ?? null;

/** Normalise whatever is stored in projects.deliverables into a string list. */
export function toDeliverables(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v)).filter(Boolean);
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v)).filter(Boolean);
    } catch {
      return value
        .split(/[,\n•]+/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

/** Fallback deliverables shown on PDFs when a project has none stored yet. */
export const DEFAULT_DELIVERABLES: string[] = [
  "Save the date shoot included",
  "Wedding day & Eve / Reception coverage",
  "60 Page Premium Album (2 Nos) with Special Luster Pages",
  "Mini Book (2 Nos) & Calendar (2 Nos)",
  "Photo Frame (2 Nos) & Album Bag (2 Nos)",
  "Full HD Video (2 Sets) & Highlight Video (2 Sets)",
];

