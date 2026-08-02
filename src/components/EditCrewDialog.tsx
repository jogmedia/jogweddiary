import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
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
import { useAssignments, useRemove, useStaff, useUpsert } from "@/lib/db";

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

  const { data: staff = [] } = useStaff();
  const { data: assignments = [] } = useAssignments();
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
        </DialogHeader>
        <CrewPicker
          staff={staff}
          value={crew}
          onChange={setCrew}
          date={date}
          projectId={projectId}
        />
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
