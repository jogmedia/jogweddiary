import { Check, ChevronsUpDown, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Staff } from "@/lib/db";

const prettyRole = (role?: string | null) =>
  (role ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Crew";

/** Multi-select crew picker showing each team member with their role. */
export function CrewPicker({
  staff,
  value,
  onChange,
  label = "Crew",
}: {
  staff: Staff[];
  value: string[];
  onChange: (ids: string[]) => void;
  label?: string;
}) {
  const available = staff.filter((s) => s.active_status !== false);
  const selected = available.filter((s) => value.includes(s.id));

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <div className="space-y-1.5">
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="w-full justify-between font-normal">
            <span className="flex items-center gap-2 truncate">
              <Users className="h-4 w-4 text-primary" />
              {selected.length ? `${selected.length} ${label.toLowerCase()} selected` : `Assign ${label.toLowerCase()}`}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(20rem,90vw)] p-0" align="start">
          {available.length === 0 ? (
            <p className="p-3 text-xs text-muted-foreground">
              No team members yet — add crew in the Staff page first.
            </p>
          ) : (
            <ScrollArea className="max-h-64">
              <div className="p-1">
                {available.map((s) => {
                  const active = value.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggle(s.id)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          active ? "border-primary bg-primary text-primary-foreground" : "border-border"
                        }`}
                      >
                        {active && <Check className="h-3 w-3" />}
                      </span>
                      <span className="truncate">
                        <span className="font-medium">{s.name}</span>
                        <span className="text-muted-foreground"> — {prettyRole(s.role)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((s) => (
            <Badge key={s.id} variant="secondary" className="gap-1 font-normal">
              {s.name} — {prettyRole(s.role)}
              <button
                type="button"
                onClick={() => toggle(s.id)}
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
