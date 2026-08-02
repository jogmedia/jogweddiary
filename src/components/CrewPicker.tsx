import { useState } from "react";
import { AlertTriangle, Check, ChevronsUpDown, Search, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Staff } from "@/lib/db";
import { useCrewBookings } from "@/lib/crew";
import { CREW_ROLES } from "@/lib/roles";

const prettyRole = (role?: string | null) =>
  (role ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Crew";

/** One crew member assigned to a sub-event, with the role for that event. */
export type CrewMember = { staffId: string; role: string | null };

/** Multi-select crew picker with a per-event role selector for each member. */
export function CrewPicker({
  staff,
  value,
  onChange,
  label = "Crew",
  date,
  projectId,
  eventId,
  time,
}: {
  staff: Staff[];
  value: CrewMember[];
  onChange: (crew: CrewMember[]) => void;
  label?: string;
  /** Event date used to check crew availability. */
  date?: string;
  /** Current project (kept for context; clashes are checked per sub-event). */
  projectId?: string;
  /** Sub-event being edited — its own booking is never a clash. */
  eventId?: string | null;
  /** Slot time of this sub-event; only overlapping slots clash. */
  time?: string | null;
}) {
  const [query, setQuery] = useState("");
  const { conflictsFor } = useCrewBookings();
  const clashes = (id: string) => conflictsFor(id, date, { excludeEventId: eventId, time });
  const available = staff.filter(
    (s) => s.active_status !== false && s.name.toLowerCase().includes(query.toLowerCase()),
  );
  const ids = value.map((v) => v.staffId);
  const selected = available.filter((s) => ids.includes(s.id));
  const clashing = selected.filter((s) => clashes(s.id).length > 0);
  const roleOf = (id: string) => value.find((v) => v.staffId === id)?.role ?? null;

  const toggle = (s: Staff) => {
    if (!ids.includes(s.id) && clashes(s.id).length > 0) return; // blocked: same date & slot
    onChange(
      ids.includes(s.id)
        ? value.filter((v) => v.staffId !== s.id)
        : [...value, { staffId: s.id, role: s.role ?? null }],
    );
  };

  const setRole = (id: string, role: string) =>
    onChange(value.map((v) => (v.staffId === id ? { ...v, role } : v)));


  return (
    <div className="space-y-1.5">
      <Popover onOpenChange={(open) => !open && setQuery("")}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="w-full justify-between font-normal">
            <span className="flex items-center gap-2 truncate">
              <Users className="h-4 w-4 text-primary" />
              {selected.length
                ? `${selected.length} ${label.toLowerCase()} selected`
                : `Assign ${label.toLowerCase()}`}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[min(22rem,92vw)] p-0 z-50"
          align="start"
          sideOffset={4}
        >
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search crew member..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-8 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          {available.length === 0 ? (
            <p className="p-3 text-xs text-muted-foreground">
              {query
                ? "No matching crew members found."
                : "No team members yet — add crew in the Staff page first."}
            </p>
          ) : (
            <ScrollArea className="h-auto max-h-60 overflow-y-auto">
              <div className="space-y-1 p-1">
                {available.map((s) => {
                  const active = ids.includes(s.id);
                  const blocked = !active && clashes(s.id).length > 0;
                  return (
                    <div key={s.id} className="rounded-md px-1 py-1">
                      <button
                        type="button"
                        onClick={() => toggle(s)}
                        disabled={blocked}
                        title={
                          blocked
                            ? `Already booked on this date & time slot (${clashes(s.id)[0]?.projectName})`
                            : undefined
                        }
                        className="flex w-full items-center gap-2 rounded-md px-1.5 py-2 text-left text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            active ? "border-primary bg-primary text-primary-foreground" : "border-border"
                          }`}
                        >
                          {active && <Check className="h-3 w-3" />}
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          <span className="font-medium">{s.name}</span>
                          <span className="text-muted-foreground"> — {prettyRole(s.role)}</span>
                        </span>
                        {clashes(s.id).length > 0 && (
                          <span className="shrink-0 rounded bg-destructive/12 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                            ⚠️ Booked
                          </span>
                        )}
                      </button>

                      {active && (
                        <div className="mt-1 pl-7 pr-1.5">
                          <Select
                            value={roleOf(s.id) ?? undefined}
                            onValueChange={(v) => setRole(s.id, v)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select role for this event" />
                            </SelectTrigger>
                            <SelectContent>
                              {CREW_ROLES.map((r) => (
                                <SelectItem key={r} value={r} className="text-xs">
                                  {r}
                                </SelectItem>
                              ))}
                              {roleOf(s.id) && !CREW_ROLES.includes(roleOf(s.id) as any) && (
                                <SelectItem value={roleOf(s.id) as string} className="text-xs">
                                  {prettyRole(roleOf(s.id))}
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </PopoverContent>
      </Popover>

      {clashing.length > 0 && (
        <div className="flex items-start gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-[11px] text-destructive">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>
            ⚠️ Already booked on this date &amp; time slot!{" "}
            {clashing
              .map((s) => {
                const other = clashes(s.id)[0];
                return `${s.name} → ${other?.projectName ?? "another event"}`;
              })
              .join(" · ")}
          </p>
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((s) => (
            <Badge
              key={s.id}
              variant={clashes(s.id).length > 0 ? "destructive" : "secondary"}

              className="gap-1 font-normal"
            >
              {s.name} — {prettyRole(roleOf(s.id) ?? s.role)}
              <button
                type="button"
                onClick={() => toggle(s)}
                aria-label={`Remove ${s.name}`}
                className="opacity-60 hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
