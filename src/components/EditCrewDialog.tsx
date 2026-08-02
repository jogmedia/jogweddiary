import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CrewPicker, type CrewMember } from "@/components/CrewPicker";
import { useAssignments, useProjectEvents, useRemove, useStaff, useUpsert } from "@/lib/db";

const prettyRole = (role?: string | null) =>
  (role ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Crew";

type Props = {
  projectId: string;
  /** Sub-event this crew belongs to (omit for projects without sub-events). */
  eventId?: string | null;
  /** Event date, used for double-booking warnings. */
  date?: string;
  title: string;
};

/** Quick crew management for one day's sub-event, straight from the dashboard. */
export function EditCrewDialog({ projectId, eventId, date, title }: Props) {
  const [open, setOpen] = useState(false);
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const { data: staff = [] } = useStaff();
  const { data: assignments = [] } = useAssignments();
  const { data: events = [] } = useProjectEvents();
  const thisEvent = eventId ? events.find((e) => e.id === eventId) : undefined;
  const slotTime =
    thisEvent?.arrival_time ?? thisEvent?.event_time ?? (thisEvent as any)?.muhurtham_time ?? null;
  const saveAssignment = useUpsert("project_assignments", "Crew assignment");
  const delAssignment = useRemove("project_assignments", "Crew assignment");


  const current = assignments.filter((a) =>
    eventId ? a.event_id === eventId : a.project_id === projectId && !a.event_id,
  );

  useEffect(() => {
    if (!open) return;
    setCrew(
      current.map((a) => ({
        staffId: a.staff_id,
        role: a.role_in_project ?? a.staff?.role ?? null,
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /** Deletes the assignment from the database immediately. */
  const removeNow = async (staffId: string) => {
    setCrew((prev) => prev.filter((v) => v.staffId !== staffId));
    const existing = current.find((a) => a.staff_id === staffId);
    if (!existing) return;
    setRemoving(staffId);
    try {
      await delAssignment.mutateAsync(existing.id);
    } finally {
      setRemoving(null);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      for (const a of current) {
        if (!crew.some((c) => c.staffId === a.staff_id)) await delAssignment.mutateAsync(a.id);
      }
      for (const c of crew) {
        const existing = current.find((a) => a.staff_id === c.staffId);
        const role = c.role ?? staff.find((s) => s.id === c.staffId)?.role ?? null;
        if (existing && existing.role_in_project === role) continue;
        await saveAssignment.mutateAsync({
          ...(existing ? { id: existing.id } : {}),
          project_id: projectId,
          ...(eventId ? { event_id: eventId } : {}),
          staff_id: c.staffId,
          role_in_project: role,
        });
      }
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="shrink-0 gap-1.5">
          <Pencil className="h-3.5 w-3.5" />
          Manage Crew
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[min(28rem,94vw)]">
        <DialogHeader>
          <DialogTitle className="text-base">Manage crew</DialogTitle>
          <DialogDescription className="truncate">{title}</DialogDescription>
          <p className="text-xs text-muted-foreground">
            Changes apply only to this sub-event{date ? ` (${date})` : ""} — other event dates stay
            untouched.
          </p>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Currently Assigned Crew
          </p>
          {crew.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
              No crew assigned yet — pick members below.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {crew.map((c) => {
                const s = staff.find((x) => x.id === c.staffId);
                return (
                  <li key={c.staffId} className="flex items-center justify-between gap-2 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{s?.name ?? "Crew"}</p>
                      <p className="truncate text-xs capitalize text-muted-foreground">
                        {prettyRole(c.role ?? s?.role)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      aria-label={`Remove ${s?.name ?? "crew member"}`}
                      className="h-8 shrink-0 gap-1.5 px-2.5"
                      disabled={removing === c.staffId}
                      onClick={() => removeNow(c.staffId)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Add / Reassign Crew
          </p>
          <CrewPicker
            staff={staff}
            value={crew}
            onChange={setCrew}
            date={date}
            projectId={projectId}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save crew"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
