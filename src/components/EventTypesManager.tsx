import { useEffect, useState, type ReactNode } from "react";
import { Check, Plus, Settings2, Trash2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEventTypes, useRemove, useUpsert, type EventType } from "@/lib/db";

/** "Wedding Eve / Sangeeth" -> "wedding_eve_sangeeth" */
export const slugifyEventType = (label: string) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48) || `event_${Date.now()}`;

/**
 * Manage the shared event-type list (add / rename / delete). Used by both the
 * project creation form and the in-project "Add event" dropdown.
 */
export function EventTypesManager({
  trigger,
  onCreated,
}: {
  trigger?: ReactNode;
  onCreated?: (slug: string) => void;
}) {
  const { data: types = [] } = useEventTypes();
  const save = useUpsert("event_types", "Event type");
  const remove = useRemove("event_types", "Event type");
  const [open, setOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newEmoji, setNewEmoji] = useState("");
  const [labels, setLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setLabels(Object.fromEntries(types.map((t) => [t.id, t.label])));
  }, [open, types]);

  const add = async () => {
    const label = newLabel.trim();
    if (!label) return;
    const existing = types.find((t) => t.label.toLowerCase() === label.toLowerCase());
    if (existing) {
      onCreated?.(existing.slug);
      setNewLabel("");
      setNewEmoji("");
      return;
    }
    let slug = slugifyEventType(label);
    if (types.some((t) => t.slug === slug)) slug = `${slug}_${Date.now().toString().slice(-4)}`;
    const maxOrder = types.reduce((m, t) => Math.max(m, t.sort_order ?? 0), 0);
    await save.mutateAsync({
      slug,
      label,
      emoji: newEmoji.trim() || "✨",
      sort_order: maxOrder + 10,
    });
    setNewLabel("");
    setNewEmoji("");
    onCreated?.(slug);
  };

  const rename = async (t: EventType) => {
    const label = (labels[t.id] ?? "").trim();
    if (!label || label === t.label) return;
    await save.mutateAsync({ id: t.id, label });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-9 w-9 shrink-0"
            aria-label="Manage event types"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4 text-primary" /> Manage event types
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <Label className="mb-1.5 block text-xs font-medium">Add new event type</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              className="w-full sm:w-16"
              placeholder="✨"
              value={newEmoji}
              onChange={(e) => setNewEmoji(e.target.value)}
              aria-label="Emoji"
            />
            <Input
              className="flex-1"
              placeholder="e.g. Baraat, Cocktail Night"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void add();
                }
              }}
            />
            <Button type="button" onClick={() => void add()} disabled={!newLabel.trim() || save.isPending}>
              <Plus className="mr-1.5 h-4 w-4" /> Add
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {types.length === 0 && (
            <p className="text-sm text-muted-foreground">No event types yet — add one above.</p>
          )}
          {types.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-card p-2"
            >
              <span className="w-6 text-center">{t.emoji ?? "✨"}</span>
              <Input
                className="min-w-0 flex-1"
                value={labels[t.id] ?? t.label}
                onChange={(e) => setLabels((p) => ({ ...p, [t.id]: e.target.value }))}
                onBlur={() => void rename(t)}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-9 w-9 shrink-0"
                aria-label={`Save ${t.label}`}
                onClick={() => void rename(t)}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-9 w-9 shrink-0 text-destructive"
                aria-label={`Delete ${t.label}`}
                onClick={() => void remove.mutateAsync(t.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
