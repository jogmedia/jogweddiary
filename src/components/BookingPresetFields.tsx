import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { RecordDialog } from "@/components/RecordDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { useUpsert } from "@/lib/db";
import { inr } from "@/lib/format";
import { BOOKING_PACKAGES, LEGACY_BOOKING_PACKAGES, PROJECT_NAME_PRESETS, packageSelection, useBookingNamePresets, useBookingPackages, type BookingPackage } from "@/lib/booking-presets";

type SetField = (name: string, value: any) => void;

export function ProjectNamePresets({ value, set }: { value: string; set: SetField }) {
  const { data = [], isError } = useBookingNamePresets();
  const save = useUpsert("booking_name_presets", "Project name preset");
  const [adding, setAdding] = useState(false);
  const names = Array.from(new Set([...PROJECT_NAME_PRESETS, ...data.map((p) => p.name)]));
  return <>
    <div className="flex flex-wrap gap-1.5 pt-1.5">
      {names.map((name) => <Button key={name} type="button" size="sm" variant={value === name ? "default" : "outline"} aria-pressed={value === name} className="h-auto min-h-8 max-w-full whitespace-normal rounded-full px-2.5 py-1 text-xs" onClick={() => set("project_name", name)}>{name}</Button>)}
      <Button type="button" size="sm" variant="ghost" className="h-auto min-h-8 rounded-full px-2.5 text-xs" onClick={() => setAdding(true)}><Plus />Add Custom Preset</Button>
    </div>
    {isError && <p className="mt-1 text-xs text-destructive">Saved presets could not be loaded.</p>}
    <RecordDialog title="Add custom project name preset" open={adding} onOpenChange={setAdding} submitLabel="Save preset" fields={[{ name: "name", label: "Preset name", required: true, full: true, validate: (v) => names.some((n) => n.toLowerCase() === String(v).trim().toLowerCase()) ? "This preset already exists" : !String(v).trim() ? "Enter a preset name" : null }]} onSubmit={async (v) => { await save.mutateAsync({ name: v.name }); set("project_name", v.name); }} />
  </>;
}

export function BookingPackageSelector({ value, set, onDeliverables }: { value: string; set: SetField; onDeliverables: (items: string[]) => void }) {
  const { data = [], isError } = useBookingPackages();
  const save = useUpsert("booking_package_templates", "Package template");
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const all = [...BOOKING_PACKAGES, ...data, ...LEGACY_BOOKING_PACKAGES];
  const selected = all.find((p) => p.name === value);
  const custom = !!value && !selected;
  const apply = (p: BookingPackage) => {
    const selection = packageSelection(p);
    set("package_name", selection.package_name);
    set("total_amount", selection.total_amount);
    onDeliverables(selection.deliverables);
    setOpen(false);
  };
  return <div className="min-w-0 space-y-2">
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><Button id="package_name" type="button" variant="outline" role="combobox" aria-label="Package" aria-expanded={open} className="h-auto min-h-10 w-full justify-between text-left"><span className="min-w-0 whitespace-normal break-words">{selected?.name ?? (custom ? "Custom / Customised Package" : "Select package")}</span><ChevronsUpDown className="shrink-0" /></Button></PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
        <Command>
          <CommandInput aria-label="Search packages" placeholder="Search packages…" className="text-base sm:text-sm" />
          <CommandList className="max-h-56">
            <CommandEmpty>No matching packages.</CommandEmpty>
            <CommandGroup heading="Booking packages">{[...BOOKING_PACKAGES, ...data].map((p) => <CommandItem key={p.id} value={`${p.name} ${p.amount}`} onSelect={() => apply(p)}><span className="min-w-0 flex-1 whitespace-normal">{p.name} — {inr(p.amount)}</span>{value === p.name && <Check className="shrink-0" />}</CommandItem>)}</CommandGroup>
            <CommandGroup><CommandItem value="Custom / Customised Package" onSelect={() => { set("package_name", "Custom / Customised Package"); setOpen(false); }}>Custom / Customised Package</CommandItem></CommandGroup>
            <CommandGroup heading="Existing studio packages">{LEGACY_BOOKING_PACKAGES.map((p) => <CommandItem key={p.id} value={p.name} onSelect={() => apply(p)}><span className="whitespace-normal">{p.name}</span></CommandItem>)}</CommandGroup>
          </CommandList>
        </Command>
        <Button type="button" variant="ghost" className="h-auto min-h-10 w-full justify-start whitespace-normal rounded-none border-t text-xs" onClick={() => { setOpen(false); setAdding(true); }}><Plus />Add New Package Template</Button>
      </PopoverContent>
    </Popover>
    {custom && <Input aria-label="Custom package description" value={value} onChange={(e) => set("package_name", e.target.value)} className="text-base sm:text-sm" />}
    {isError && <p className="text-xs text-destructive">Saved packages could not be loaded.</p>}
    <RecordDialog title="Add new package template" open={adding} onOpenChange={setAdding} submitLabel="Save package template" fields={[
      { name: "name", label: "Package name", required: true, full: true, validate: (v) => all.some((p) => p.name.toLowerCase() === String(v).trim().toLowerCase()) ? "This package already exists" : !String(v).trim() ? "Enter a package name" : null },
      { name: "amount", label: "Base price (₹)", type: "number", required: true, full: true, validate: (v) => !Number.isFinite(Number(v)) || Number(v) < 0 ? "Enter a valid price of zero or more" : null },
      { name: "deliverables", label: "Default deliverables", type: "textarea", required: true, placeholder: "One deliverable per line", validate: (v) => !String(v).trim() ? "Enter at least one deliverable" : null },
    ]} onSubmit={async (v) => {
      const items = String(v.deliverables).split("\n").map((s) => s.trim()).filter(Boolean);
      const id = await save.mutateAsync({ name: v.name, amount: v.amount, items });
      if (id) apply({ id, name: v.name, amount: Number(v.amount), items });
    }} />
  </div>;
}